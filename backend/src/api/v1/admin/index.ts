import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../config/database.js";
import { loadEnv } from "../../../config/env.js";
import { ok } from "../../../utils/api-response.js";
import { requireAuth, requirePermission, requireUser } from "../../../middleware/auth.js";
import { bookingService, serializeBooking, serializeDriverParty, getBookingPaymentSummary, recordBookingPayment, setBookingPaymentStatus } from "../../../services/booking.service.js";
import { saveDriverPhotoBytes, driverPhotoPublicPath } from "../../../services/driver-photo.service.js";
import {
  adminPhotoPublicPath,
  deleteAdminPhoto,
  saveAdminPhotoBytes,
} from "../../../services/admin-photo.service.js";
import {
  resolveCustomerEmail,
  sendBookingInvoiceEmail,
  serializeInvoice,
  upsertBookingInvoice,
} from "../../../services/invoice.service.js";
import { feedbackPageUrl, whatsappUrl } from "../../../services/feedback.service.js";
import { NotFoundError, ValidationError, ConflictError, ServiceUnavailableError } from "../../../errors/app-error.js";
import {
  deliverAdminNotification,
  deliverBookingNotification,
  type AdminNotificationAudience,
} from "../../../services/fcm.service.js";
import type { TripType } from "@prisma/client";
import { hashPassword } from "../../../utils/crypto.js";
import { absolutePublicUrl } from "../../../utils/public-url.js";

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earth = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

function liveProgress(input: {
  status: string;
  here: { lat: number; lng: number } | null;
  pickup: { lat: number; lng: number } | null;
  drop: { lat: number; lng: number } | null;
  speedKmh: number | null;
  estimatedKm: number | null;
}): { progress: number; etaMin: number | null } {
  const speed = input.speedKmh && input.speedKmh > 3 ? input.speedKmh : 32;
  const status = input.status;
  if (status === "trip_started") {
    const total =
      input.pickup && input.drop
        ? Math.max(haversineKm(input.pickup, input.drop), 0.4)
        : Math.max(input.estimatedKm ?? 8, 0.4);
    const done =
      input.here && input.pickup ? haversineKm(input.pickup, input.here) : total * 0.45;
    const remaining = input.here && input.drop ? haversineKm(input.here, input.drop) : Math.max(total - done, 0.3);
    return {
      progress: Math.round(Math.min(97, Math.max(38, (done / total) * 100))),
      etaMin: Math.max(1, Math.round((remaining / speed) * 60)),
    };
  }
  if (status === "arrived") {
    return { progress: 34, etaMin: 2 };
  }
  if (status === "on_the_way") {
    const remaining = input.here && input.pickup ? haversineKm(input.here, input.pickup) : 4;
    return {
      progress: Math.round(Math.min(28, Math.max(8, 28 - remaining * 2))),
      etaMin: Math.max(1, Math.round((remaining / speed) * 60)),
    };
  }
  return { progress: 6, etaMin: null };
}

async function audit(
  adminId: bigint,
  action: string,
  entityType: string,
  entityId: string | null,
  oldValues: unknown,
  newValues: unknown,
  req: { ip: string; headers: Record<string, unknown> },
) {
  let entityBig: bigint | null = null;
  if (entityId && /^\d+$/.test(entityId)) entityBig = BigInt(entityId);
  await prisma.auditLogs.create({
    data: {
      admin_user_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityBig,
      old_values: oldValues as object | undefined,
      new_values: newValues as object | undefined,
      ip_address: req.ip,
      user_agent: String(req.headers["user-agent"] ?? ""),
    },
  });
}

function serializeDriver(d: {
  id: bigint;
  name: string;
  phone: string;
  email: string | null;
  license_no: string | null;
  license_expiry_date: Date | null;
  address: string | null;
  profile_image_url?: string | null;
  verification_status: string;
  online_status: string;
  availability_status: string;
  is_active: boolean;
  rating_avg: unknown;
  total_completed_trips: number;
  created_at: Date;
}) {
  const party = serializeDriverParty(d);
  return {
    id: String(d.id),
    name: d.name,
    phone: d.phone,
    email: d.email,
    license_no: d.license_no,
    license_expiry_date: d.license_expiry_date
      ? d.license_expiry_date.toISOString().slice(0, 10)
      : null,
    address: d.address,
    profile_image_url: party?.profile_image_url ?? null,
    photo_url: party?.photo_url ?? null,
    verification_status: d.verification_status,
    online_status: d.online_status,
    availability_status: d.availability_status,
    is_active: d.is_active,
    rating_avg: Number(d.rating_avg),
    total_completed_trips: d.total_completed_trips,
    created_at: d.created_at,
  };
}

function serializeRoute(
  r: {
    id: bigint;
    pickup_city_id: bigint;
    drop_city_id: bigint;
    slug: string;
    title: string;
    distance_km: unknown;
    duration_minutes: number | null;
    route_map_embed_url: string | null;
    content: string | null;
    faq_content: string | null;
    image_url?: string | null;
    amount?: unknown;
    is_popular: boolean;
    is_active: boolean;
    created_at: Date;
  },
  cities?: { pickup_city_name?: string | null; drop_city_name?: string | null },
) {
  return {
    id: String(r.id),
    pickup_city_id: String(r.pickup_city_id),
    drop_city_id: String(r.drop_city_id),
    pickup_city_name: cities?.pickup_city_name ?? null,
    drop_city_name: cities?.drop_city_name ?? null,
    corridor:
      cities?.pickup_city_name && cities?.drop_city_name
        ? `${cities.pickup_city_name} → ${cities.drop_city_name}`
        : null,
    slug: r.slug,
    title: r.title,
    distance_km: Number(r.distance_km),
    duration_minutes: r.duration_minutes,
    route_map_embed_url: r.route_map_embed_url,
    content: r.content,
    faq_content: r.faq_content,
    image_url: r.image_url ?? null,
    amount: r.amount != null ? Number(r.amount) : null,
    is_popular: r.is_popular,
    is_active: r.is_active,
    created_at: r.created_at,
  };
}

function toDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function serializeTariff(
  t: {
    id: bigint;
    vehicle_category_id: bigint;
    trip_type: string;
    route_id: bigint | null;
    rate_per_km: unknown;
    base_fare: unknown;
    driver_batta: unknown;
    minimum_km: unknown;
    minimum_fare: unknown;
    extra_km_rate: unknown;
    extra_hour_rate: unknown;
    night_charge: unknown;
    waiting_charge_per_hour: unknown;
    permit_charge: unknown;
    toll_included: boolean;
    parking_included: boolean;
    gst_percentage: unknown;
    effective_from: Date;
    effective_to: Date | null;
    is_active: boolean;
    created_at: Date;
  },
  names?: { category_name?: string | null; route_title?: string | null },
) {
  const tripLabels: Record<string, string> = {
    one_way: "One way",
    round_trip: "Round trip",
    airport: "Airport",
    outstation: "Outstation",
    local_rental: "Local rental",
  };
  return {
    id: String(t.id),
    vehicle_category_id: String(t.vehicle_category_id),
    category_name: names?.category_name ?? null,
    trip_type: t.trip_type,
    trip_type_label: tripLabels[t.trip_type] ?? t.trip_type,
    route_id: t.route_id != null ? String(t.route_id) : null,
    route_title: names?.route_title ?? null,
    route_label: names?.route_title ?? (t.route_id == null ? "All routes" : `Route #${t.route_id}`),
    rate_per_km: Number(t.rate_per_km),
    base_fare: Number(t.base_fare),
    driver_batta: Number(t.driver_batta),
    minimum_km: Number(t.minimum_km),
    minimum_fare: Number(t.minimum_fare),
    extra_km_rate: Number(t.extra_km_rate),
    extra_hour_rate: Number(t.extra_hour_rate),
    night_charge: Number(t.night_charge),
    waiting_charge_per_hour: Number(t.waiting_charge_per_hour),
    permit_charge: Number(t.permit_charge),
    toll_included: t.toll_included,
    parking_included: t.parking_included,
    gst_percentage: Number(t.gst_percentage),
    effective_from: toDateOnly(t.effective_from),
    effective_to: toDateOnly(t.effective_to),
    is_active: t.is_active,
    created_at: t.created_at,
  };
}

function serializeCustomer(c: {
  id: bigint;
  name: string;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  preferred_language: string;
  referral_code: string | null;
  app_status: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}) {
  const statusLabels: Record<string, string> = {
    active: "Active",
    blocked: "Blocked",
    deleted: "Deleted",
  };
  return {
    id: String(c.id),
    name: c.name,
    email: c.email,
    phone: c.phone,
    alternate_phone: c.alternate_phone,
    address: c.address,
    city: c.city,
    preferred_language: c.preferred_language,
    referral_code: c.referral_code,
    app_status: c.app_status,
    app_status_label: statusLabels[c.app_status] ?? c.app_status,
    is_active: c.is_active,
    last_login_at: c.last_login_at?.toISOString() ?? null,
    created_at: c.created_at.toISOString(),
  };
}

function serializeEnquiry(e: {
  id: bigint;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  assigned_admin_id: bigint | null;
  admin_note: string | null;
  created_at: Date;
  updated_at: Date | null;
}) {
  const statusLabels: Record<string, string> = {
    new: "New",
    in_progress: "In progress",
    closed: "Closed",
    spam: "Spam",
  };
  return {
    id: String(e.id),
    name: e.name,
    email: e.email,
    phone: e.phone,
    subject: e.subject,
    message: e.message,
    status: e.status,
    status_label: statusLabels[e.status] ?? e.status,
    assigned_admin_id: e.assigned_admin_id != null ? String(e.assigned_admin_id) : null,
    admin_note: e.admin_note,
    created_at: e.created_at.toISOString(),
    updated_at: e.updated_at?.toISOString() ?? null,
  };
}

function serializeTestimonial(t: {
  id: bigint;
  customer_name: string;
  customer_phone: string | null;
  rating: number;
  review: string;
  admin_reply: string | null;
  approval_status: string;
  is_featured: boolean;
  created_at: Date;
}) {
  const statusLabels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  const snippet = t.review.length > 80 ? `${t.review.slice(0, 77)}…` : t.review;
  return {
    id: String(t.id),
    customer_name: t.customer_name,
    customer_phone: t.customer_phone,
    rating: t.rating,
    review: t.review,
    review_snippet: snippet,
    admin_reply: t.admin_reply,
    approval_status: t.approval_status,
    status_label: statusLabels[t.approval_status] ?? t.approval_status,
    is_featured: t.is_featured,
    created_at: t.created_at.toISOString(),
  };
}

function serializeFaq(f: {
  id: bigint;
  question: string;
  answer: string;
  category: string | null;
  related_type: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
}) {
  return {
    id: String(f.id),
    question: f.question,
    answer: f.answer,
    category: f.category,
    related_type: f.related_type,
    related_type_label: f.related_type
      ? f.related_type.charAt(0).toUpperCase() + f.related_type.slice(1).replace(/_/g, ' ')
      : null,
    display_order: f.display_order,
    is_active: f.is_active,
    created_at: f.created_at.toISOString(),
  };
}

function serializeVehicleCategory(c: {
  id: bigint;
  name: string;
  slug: string;
  seating_capacity: number;
  luggage_capacity: string | null;
  description: string | null;
  image_url: string | null;
  one_way_rate_per_km: unknown;
  round_trip_rate_per_km: unknown;
  driver_batta: unknown;
  minimum_km_per_day: unknown;
  display_order: number;
  is_active: boolean;
  created_at: Date;
}) {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    seating_capacity: c.seating_capacity,
    luggage_capacity: c.luggage_capacity,
    description: c.description,
    image_url: c.image_url,
    one_way_rate_per_km: Number(c.one_way_rate_per_km),
    round_trip_rate_per_km: Number(c.round_trip_rate_per_km),
    driver_batta: Number(c.driver_batta),
    minimum_km_per_day: Number(c.minimum_km_per_day),
    display_order: c.display_order,
    is_active: c.is_active,
    created_at: c.created_at,
  };
}

function assignmentEndAt(assignedFrom: Date, preferredEnd: Date): Date {
  return preferredEnd.getTime() >= assignedFrom.getTime() ? preferredEnd : new Date(assignedFrom.getTime());
}

async function endCurrentAssignments(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  where: { driver_id?: bigint; vehicle_id?: bigint },
  preferredEnd: Date,
) {
  const current = await tx.driverVehicleAssignments.findMany({
    where: { ...where, is_current: true },
  });
  for (const row of current) {
    await tx.driverVehicleAssignments.update({
      where: { id: row.id },
      data: {
        is_current: false,
        assigned_to: assignmentEndAt(row.assigned_from, preferredEnd),
      },
    });
  }
}

function serializeAssignment(
  a: {
    id: bigint;
    driver_id: bigint;
    vehicle_id: bigint;
    assigned_from: Date;
    assigned_to: Date | null;
    is_current: boolean;
    created_at: Date;
  },
  names?: { driver_name?: string | null; driver_phone?: string | null; vehicle_name?: string | null; registration_no?: string | null },
) {
  return {
    id: String(a.id),
    driver_id: String(a.driver_id),
    driver_name: names?.driver_name ?? null,
    driver_phone: names?.driver_phone ?? null,
    vehicle_id: String(a.vehicle_id),
    vehicle_name: names?.vehicle_name ?? null,
    registration_no: names?.registration_no ?? null,
    assigned_from: a.assigned_from.toISOString(),
    assigned_to: a.assigned_to?.toISOString() ?? null,
    is_current: a.is_current,
    status_label: a.is_current ? "Current" : "Ended",
    created_at: a.created_at.toISOString(),
  };
}

function serializeVehicle(
  v: {
    id: bigint;
    category_id: bigint;
    vehicle_name: string;
    registration_no: string | null;
    model_name: string | null;
    color: string | null;
    fuel_type: string;
    rc_expiry_date: Date | null;
    insurance_expiry_date: Date | null;
    permit_expiry_date: Date | null;
    pollution_expiry_date: Date | null;
    is_active: boolean;
    created_at: Date;
  },
  categoryName?: string | null,
) {
  return {
    id: String(v.id),
    category_id: String(v.category_id),
    category_name: categoryName ?? null,
    vehicle_name: v.vehicle_name,
    registration_no: v.registration_no,
    model_name: v.model_name,
    color: v.color,
    fuel_type: v.fuel_type,
    rc_expiry_date: toDateOnly(v.rc_expiry_date),
    insurance_expiry_date: toDateOnly(v.insurance_expiry_date),
    permit_expiry_date: toDateOnly(v.permit_expiry_date),
    pollution_expiry_date: toDateOnly(v.pollution_expiry_date),
    is_active: v.is_active,
    created_at: v.created_at,
  };
}

function serializeAdminProfile(a: {
  id: bigint;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role_id: bigint;
}) {
  return {
    id: String(a.id),
    name: a.name,
    email: a.email,
    phone: a.phone,
    avatar_url: a.avatar_url ? adminPhotoPublicPath(a.id) : null,
    role_id: String(a.role_id),
  };
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth("admin"));

  app.get("/profile", async (req, reply) => {
    const user = requireUser(req);
    const admin = await prisma.adminUsers.findUnique({ where: { id: user.id } });
    if (!admin) throw new NotFoundError("Admin not found.");
    return ok(reply, serializeAdminProfile(admin));
  });

  app.put("/profile", async (req, reply) => {
    const user = requireUser(req);
    const existing = await prisma.adminUsers.findUnique({ where: { id: user.id } });
    if (!existing) throw new NotFoundError("Admin not found.");
    const schema = z.object({
      name: z.string().min(2).max(120),
      email: z.string().email().max(150),
      phone: z.string().min(8).max(20).optional().nullable(),
      password: z.string().min(8).max(120).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const email = d.email.trim().toLowerCase();
    const phone = d.phone?.trim() || null;

    const emailClash = await prisma.adminUsers.findFirst({
      where: { email, NOT: { id: user.id } },
    });
    if (emailClash) throw new ConflictError("Email already in use.");
    if (phone) {
      const phoneClash = await prisma.adminUsers.findFirst({
        where: { phone, NOT: { id: user.id } },
      });
      if (phoneClash) throw new ConflictError("Phone already in use.");
    }

    const updated = await prisma.adminUsers.update({
      where: { id: user.id },
      data: {
        name: d.name.trim(),
        email,
        phone,
        ...(d.password ? { password_hash: await hashPassword(d.password) } : {}),
      },
    });
    await audit(
      user.id,
      "admin.profile.update",
      "admin_users",
      String(user.id),
      serializeAdminProfile(existing),
      serializeAdminProfile(updated),
      req,
    );
    return ok(reply, serializeAdminProfile(updated), "Profile updated.");
  });

  app.post("/profile/photo", async (req, reply) => {
    const user = requireUser(req);
    const existing = await prisma.adminUsers.findUnique({ where: { id: user.id } });
    if (!existing) throw new NotFoundError("Admin not found.");

    const file = await req.file();
    if (!file) throw new ValidationError("Image file is required.");
    const mime = file.mimetype || "";
    if (!mime.startsWith("image/")) throw new ValidationError("Only image uploads are allowed.");

    const bytes = await file.toBuffer();
    let saved: { publicPath: string };
    try {
      saved = await saveAdminPhotoBytes(user.id, bytes, mime);
    } catch (err) {
      if (err instanceof Error && err.message === "UNSUPPORTED_IMAGE") {
        throw new ValidationError("Use a JPEG, PNG, WebP, or GIF photo.");
      }
      throw err;
    }

    const updated = await prisma.adminUsers.update({
      where: { id: user.id },
      data: { avatar_url: saved.publicPath },
    });
    await audit(user.id, "admin.profile.photo", "admin_users", String(user.id), null, { avatar_url: saved.publicPath }, req);
    return ok(reply, serializeAdminProfile(updated), "Profile photo updated.");
  });

  app.delete("/profile/photo", async (req, reply) => {
    const user = requireUser(req);
    const existing = await prisma.adminUsers.findUnique({ where: { id: user.id } });
    if (!existing) throw new NotFoundError("Admin not found.");
    await deleteAdminPhoto(user.id);
    const updated = await prisma.adminUsers.update({
      where: { id: user.id },
      data: { avatar_url: null },
    });
    await audit(user.id, "admin.profile.photo.remove", "admin_users", String(user.id), { avatar_url: existing.avatar_url }, { avatar_url: null }, req);
    return ok(reply, serializeAdminProfile(updated), "Profile photo removed.");
  });

  app.post("/devices", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      platform: z.enum(["android", "ios", "web"]),
      fcm_token: z.string().min(10),
      device_uuid: z.string().optional(),
      app_version: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const row = await prisma.appDevices.upsert({
      where: { fcm_token: parsed.data.fcm_token },
      create: {
        user_type: "admin",
        admin_user_id: user.id,
        platform: parsed.data.platform,
        fcm_token: parsed.data.fcm_token,
        device_uuid: parsed.data.device_uuid,
        app_version: parsed.data.app_version,
        last_seen_at: new Date(),
      },
      update: {
        admin_user_id: user.id,
        user_type: "admin",
        is_active: true,
        last_seen_at: new Date(),
        app_version: parsed.data.app_version,
      },
    });
    return ok(reply, { id: String(row.id) }, "Device registered.", 201);
  });

  app.get(
    "/dashboard",
    { preHandler: [requirePermission("dashboard.view")] },
    async (_req, reply) => {
      const [bookings, pending, drivers, customers, today, enquiries] = await Promise.all([
        prisma.bookings.count(),
        prisma.bookings.count({ where: { status: "pending" } }),
        prisma.drivers.count({ where: { is_active: true } }),
        prisma.customers.count({ where: { is_active: true } }),
        prisma.bookings.count({
          where: {
            created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        prisma.contactEnquiries.count(),
      ]);
      return ok(reply, {
        total_bookings: bookings,
        pending_bookings: pending,
        active_drivers: drivers,
        customers,
        bookings_today: today,
        enquiries,
      });
    },
  );

  app.get(
    "/live-tracking",
    { preHandler: [requirePermission("dashboard.view")] },
    async (_req, reply) => {
      const liveStatuses = [
        "driver_accepted",
        "driver_assigned",
        "on_the_way",
        "arrived",
        "trip_started",
      ] as const;

      const bookings = await prisma.bookings.findMany({
        where: { status: { in: [...liveStatuses] } },
        orderBy: { pickup_at: "asc" },
        take: 50,
      });

      const driverIds = [
        ...new Set(bookings.map((b) => b.assigned_driver_id).filter((id): id is bigint => id != null)),
      ];
      const vehicleIds = [
        ...new Set(bookings.map((b) => b.assigned_vehicle_id).filter((id): id is bigint => id != null)),
      ];
      const bookingIds = bookings.map((b) => b.id);

      const [drivers, vehicles, locationRows] = await Promise.all([
        driverIds.length
          ? prisma.drivers.findMany({ where: { id: { in: driverIds } } })
          : Promise.resolve([]),
        vehicleIds.length
          ? prisma.vehicles.findMany({ where: { id: { in: vehicleIds } } })
          : Promise.resolve([]),
        bookingIds.length || driverIds.length
          ? prisma.driverLocations.findMany({
              where: {
                OR: [
                  ...(bookingIds.length ? [{ booking_id: { in: bookingIds } }] : []),
                  ...(driverIds.length ? [{ driver_id: { in: driverIds } }] : []),
                ],
              },
              orderBy: { recorded_at: "desc" },
              take: 400,
            })
          : Promise.resolve([]),
      ]);

      const driverMap = new Map(drivers.map((d) => [String(d.id), d]));
      const vehicleMap = new Map(vehicles.map((v) => [String(v.id), v]));
      const locByBooking = new Map<string, (typeof locationRows)[number]>();
      const locByDriver = new Map<string, (typeof locationRows)[number]>();
      for (const loc of locationRows) {
        if (loc.booking_id) {
          const key = String(loc.booking_id);
          if (!locByBooking.has(key)) locByBooking.set(key, loc);
        }
        const driverKey = String(loc.driver_id);
        if (!locByDriver.has(driverKey)) locByDriver.set(driverKey, loc);
      }

      const now = Date.now();
      return ok(
        reply,
        bookings.map((booking) => {
          const driver = booking.assigned_driver_id
            ? driverMap.get(String(booking.assigned_driver_id))
            : null;
          const vehicle = booking.assigned_vehicle_id
            ? vehicleMap.get(String(booking.assigned_vehicle_id))
            : null;
          const sample =
            locByBooking.get(String(booking.id)) ??
            (booking.assigned_driver_id ? locByDriver.get(String(booking.assigned_driver_id)) : null);

          let latitude =
            sample != null
              ? Number(sample.latitude)
              : driver?.current_latitude != null
                ? Number(driver.current_latitude)
                : null;
          let longitude =
            sample != null
              ? Number(sample.longitude)
              : driver?.current_longitude != null
                ? Number(driver.current_longitude)
                : null;
          const recordedAt = sample?.recorded_at ?? driver?.last_location_at ?? null;
          const speed = sample?.speed_kmph != null ? Number(sample.speed_kmph) : null;
          const heading = sample?.heading != null ? Number(sample.heading) : null;
          const pickupLat = booking.pickup_latitude != null ? Number(booking.pickup_latitude) : null;
          const pickupLng = booking.pickup_longitude != null ? Number(booking.pickup_longitude) : null;
          const dropLat = booking.drop_latitude != null ? Number(booking.drop_latitude) : null;
          const dropLng = booking.drop_longitude != null ? Number(booking.drop_longitude) : null;

          const here = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;
          const pickup = pickupLat != null && pickupLng != null ? { lat: pickupLat, lng: pickupLng } : null;
          const drop = dropLat != null && dropLng != null ? { lat: dropLat, lng: dropLng } : null;

          const { progress, etaMin } = liveProgress({
            status: booking.status ?? "pending",
            here,
            pickup,
            drop,
            speedKmh: speed,
            estimatedKm: booking.estimated_distance_km != null ? Number(booking.estimated_distance_km) : null,
          });

          return {
            id: String(booking.id),
            booking_reference: booking.booking_reference,
            status: booking.status ?? "pending",
            customer_name: booking.customer_name,
            pickup_location: booking.pickup_location,
            drop_location: booking.drop_location,
            pickup_latitude: pickupLat,
            pickup_longitude: pickupLng,
            drop_latitude: dropLat,
            drop_longitude: dropLng,
            progress,
            eta_min: etaMin,
            driver: serializeDriverParty(driver),
            vehicle: vehicle
              ? {
                  name: vehicle.vehicle_name,
                  registration: vehicle.registration_no,
                }
              : null,
            location: here
              ? {
                  latitude: here.lat,
                  longitude: here.lng,
                  heading,
                  speed_kmph: speed,
                  recorded_at: recordedAt?.toISOString() ?? null,
                  stale: recordedAt ? now - recordedAt.getTime() > 90_000 : true,
                }
              : null,
          };
        }),
      );
    },
  );

  app.get(
    "/bookings",
    { preHandler: [requirePermission("bookings.view")] },
    async (req, reply) => {
      const q = req.query as { page?: string; per_page?: string; status?: string };
      const page = Math.max(1, Number(q.page ?? 1) || 1);
      const perPage = Math.min(500, Math.max(1, Number(q.per_page ?? 20) || 20));
      const where = q.status ? { status: q.status as never } : {};
      const [total, rows] = await Promise.all([
        prisma.bookings.count({ where }),
        prisma.bookings.findMany({
          where,
          orderBy: { created_at: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
      ]);
      const driverIds = [
        ...new Set(rows.map((r) => r.assigned_driver_id).filter((id): id is bigint => id != null)),
      ];
      const drivers =
        driverIds.length > 0
          ? await prisma.drivers.findMany({ where: { id: { in: driverIds } } })
          : [];
      const driverMap = new Map(drivers.map((d) => [String(d.id), d]));
      return ok(
        reply,
        rows.map((b) => {
          const d = b.assigned_driver_id ? driverMap.get(String(b.assigned_driver_id)) : null;
          return {
            ...serializeBooking(b),
            created_at: b.created_at.toISOString(),
            driver: serializeDriverParty(d),
          };
        }),
        "Bookings fetched.",
        200,
        {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      );
    },
  );

  app.get(
    "/bookings/:id",
    { preHandler: [requirePermission("bookings.view")] },
    async (req, reply) => {
      const id = BigInt((req.params as { id: string }).id);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundError();
      const [history, driver, vehicle, invoiceRow, customerEmail] = await Promise.all([
        prisma.bookingStatusHistory.findMany({
          where: { booking_id: id },
          orderBy: { changed_at: "asc" },
        }),
        booking.assigned_driver_id
          ? prisma.drivers.findUnique({ where: { id: booking.assigned_driver_id } })
          : Promise.resolve(null),
        booking.assigned_vehicle_id
          ? prisma.vehicles.findUnique({ where: { id: booking.assigned_vehicle_id } })
          : Promise.resolve(null),
        prisma.bookingInvoices.findUnique({ where: { booking_id: id } }),
        resolveCustomerEmail(id),
      ]);
      const payment = await getBookingPaymentSummary(id);
      return ok(reply, {
        ...serializeBooking(booking),
        customer_email: customerEmail,
        created_at: booking.created_at.toISOString(),
        confirmed_at: booking.confirmed_at?.toISOString() ?? null,
        completed_at: booking.completed_at?.toISOString() ?? null,
        driver: serializeDriverParty(driver),
        vehicle: vehicle
          ? {
              id: String(vehicle.id),
              name: vehicle.vehicle_name,
              registration: vehicle.registration_no,
            }
          : null,
        invoice: invoiceRow ? serializeInvoice(invoiceRow) : null,
        payment,
        history: history.map((h) => ({
          old_status: h.old_status,
          new_status: h.new_status,
          note: h.note,
          changed_at: h.changed_at.toISOString(),
        })),
      });
    },
  );

  app.post(
    "/bookings",
    { preHandler: [requirePermission("bookings.create")] },
    async (req, reply) => {
      const user = requireUser(req);
      const schema = z.object({
        vehicle_category_id: z.union([z.string(), z.number()]),
        route_id: z.union([z.string(), z.number()]).optional().nullable(),
        trip_type: z.enum(["one_way", "round_trip", "airport", "outstation", "local_rental"]),
        customer_name: z.string().min(2),
        customer_phone: z.string().min(8),
        customer_email: z.string().email().optional().nullable(),
        pickup_location: z.string().min(2),
        drop_location: z.string().min(2),
        pickup_at: z.string(),
        coupon_code: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
      const d = parsed.data;
      const data = await bookingService.create({
        vehicleCategoryId: BigInt(d.vehicle_category_id),
        routeId: d.route_id != null ? BigInt(d.route_id) : null,
        tripType: d.trip_type as TripType,
        bookingSource: "admin",
        customerName: d.customer_name,
        customerPhone: d.customer_phone,
        customerEmail: d.customer_email,
        pickupLocation: d.pickup_location,
        dropLocation: d.drop_location,
        pickupAt: new Date(d.pickup_at),
        couponCode: d.coupon_code,
        createdByAdminId: user.id,
      });
      await audit(user.id, "booking.create", "bookings", data.id, null, data, req);
      return ok(reply, data, "Booking created.", 201);
    },
  );

  app.post(
    "/bookings/:id/confirm",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const data = await bookingService.transition({
        bookingId: id,
        to: "confirmed",
        actor: { type: "admin", adminId: user.id },
        note: "Confirmed by admin",
      });
      await audit(user.id, "booking.confirm", "bookings", String(id), null, data, req);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (booking?.customer_id) {
        await deliverBookingNotification({
          recipientType: "customer",
          customerId: String(booking.customer_id),
          bookingId: String(id),
          jobType: "notify_booking_confirmed",
          title: "Booking confirmed",
          body: `Your booking ${booking.booking_reference} is confirmed. We will assign a driver shortly.`,
        });
      }
      const emailResult = await sendBookingInvoiceEmail(id);
      return ok(
        reply,
        {
          ...data,
          invoice: emailResult.invoice ?? null,
          email_sent: emailResult.sent,
          email_to: emailResult.email,
          email_error: emailResult.error ?? null,
        },
        emailResult.sent
          ? `Booking confirmed. Invoice emailed to ${emailResult.email}.`
          : emailResult.email
            ? `Booking confirmed. Invoice email failed: ${emailResult.error}`
            : "Booking confirmed. No customer email on file.",
      );
    },
  );

  app.post(
    "/bookings/:id/reject",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const reason = (req.body as { reason?: string } | null)?.reason ?? "Rejected by admin";
      const data = await bookingService.transition({
        bookingId: id,
        to: "rejected",
        actor: { type: "admin", adminId: user.id },
        note: reason,
      });
      await audit(user.id, "booking.reject", "bookings", String(id), null, data, req);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (booking?.customer_id) {
        await deliverBookingNotification({
          recipientType: "customer",
          customerId: String(booking.customer_id),
          bookingId: String(id),
          jobType: "notify_booking_rejected",
          title: "Booking declined",
          body: `Your booking ${booking.booking_reference} was declined. ${reason}`,
        });
      }
      return ok(reply, data, "Booking rejected.");
    },
  );

  app.get(
    "/bookings/:id/invoice",
    { preHandler: [requirePermission("bookings.view")] },
    async (req, reply) => {
      const id = BigInt((req.params as { id: string }).id);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundError();
      const { invoice } = await upsertBookingInvoice(id);
      return ok(reply, {
        ...invoice,
        customer_email: await resolveCustomerEmail(id),
      });
    },
  );

  app.get(
    "/bookings/:id/invoice/pdf",
    { preHandler: [requirePermission("bookings.view")] },
    async (req, reply) => {
      const id = BigInt((req.params as { id: string }).id);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundError();
      const { invoice, pdfBuffer } = await upsertBookingInvoice(id);
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `inline; filename="${invoice.invoice_number}.pdf"`)
        .send(pdfBuffer);
    },
  );

  app.post(
    "/bookings/:id/invoice/resend",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundError();
      const parsed = z
        .object({
          email: z.string().email("Enter a valid email address.").max(150).optional(),
        })
        .safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      }
      const override = parsed.data.email?.trim();
      const result = await sendBookingInvoiceEmail(id, override);
      await audit(
        user.id,
        "booking.invoice_resend",
        "bookings",
        String(id),
        null,
        { email: result.email, sent: result.sent },
        req,
      );
      if (!result.email) throw new ValidationError("Customer has no email address.");
      if (!result.sent) {
        throw new ServiceUnavailableError(result.error || "Failed to send invoice email.");
      }
      return ok(
        reply,
        { ...result.invoice, email_sent: true, email_to: result.email },
        `Invoice emailed to ${result.email}.`,
      );
    },
  );

  app.post(
    "/bookings/:id/invoice/whatsapp",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundError();
      const { invoice } = await upsertBookingInvoice(id);
      const pdfUrl = absolutePublicUrl(invoice.pdf_url, req);
      const message = [
        `Yaazh Cabs invoice ${invoice.invoice_number}`,
        `Booking ${booking.booking_reference}`,
        `${booking.pickup_location} → ${booking.drop_location}`,
        "",
        "Download your invoice PDF:",
        pdfUrl,
      ].join("\n");
      const wa = whatsappUrl(booking.customer_phone, message);
      await audit(
        user.id,
        "booking.invoice_whatsapp",
        "bookings",
        String(id),
        null,
        { phone: booking.customer_phone, pdf_url: pdfUrl },
        req,
      );
      return ok(
        reply,
        {
          invoice,
          pdf_url: pdfUrl,
          whatsapp_url: wa,
          phone: booking.customer_phone,
          message,
        },
        "Invoice ready to send on WhatsApp.",
      );
    },
  );

  app.post(
    "/bookings/:id/feedback-link",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundError();
      const feedbackUrl = feedbackPageUrl(id);
      const message = [
        `Hi ${booking.customer_name},`,
        `Thank you for riding with Yaazh Cabs (${booking.booking_reference}).`,
        "",
        "Please rate your trip and share a short review:",
        feedbackUrl,
      ].join("\n");
      const wa = whatsappUrl(booking.customer_phone, message);
      await audit(
        user.id,
        "booking.feedback_link",
        "bookings",
        String(id),
        null,
        { phone: booking.customer_phone, feedback_url: feedbackUrl },
        req,
      );
      return ok(
        reply,
        {
          feedback_url: feedbackUrl,
          whatsapp_url: wa,
          phone: booking.customer_phone,
          message,
        },
        "Feedback link ready to send on WhatsApp.",
      );
    },
  );

  app.post(
    "/bookings/:id/cancel",
    { preHandler: [requirePermission("bookings.cancel")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const reason = (req.body as { reason?: string } | null)?.reason;
      const data = await bookingService.cancel(id, { type: "admin", adminId: user.id }, reason);
      await audit(user.id, "booking.cancel", "bookings", String(id), null, data, req);
      return ok(reply, data, "Booking cancelled.");
    },
  );

  app.post(
    "/bookings/:id/assign-driver",
    { preHandler: [requirePermission("driver_offers.manage")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const schema = z.object({
        driver_id: z.union([z.string(), z.number()]),
        vehicle_id: z.union([z.string(), z.number()]).optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

      const data = await bookingService.assignDriver({
        bookingId: id,
        driverId: BigInt(parsed.data.driver_id),
        vehicleId: parsed.data.vehicle_id != null ? BigInt(parsed.data.vehicle_id) : null,
        adminId: user.id,
      });

      await audit(user.id, "booking.assign_driver", "bookings", String(id), null, data, req);
      return ok(reply, data, "Driver assigned and notified.", 200);
    },
  );

  app.post(
    "/bookings/:id/complete",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const data = await bookingService.completeByAdmin(id, user.id);
      await audit(user.id, "booking.complete", "bookings", String(id), null, data, req);
      return ok(reply, data, "Trip completed.");
    },
  );

  app.get(
    "/bookings/:id/payment",
    { preHandler: [requirePermission("bookings.view")] },
    async (req, reply) => {
      const id = BigInt((req.params as { id: string }).id);
      const booking = await prisma.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundError();
      return ok(reply, await getBookingPaymentSummary(id));
    },
  );

  /** Admin records cash / UPI / partial payment against a booking. */
  app.post(
    "/bookings/:id/payment",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const schema = z.object({
        amount: z.number().positive(),
        method: z.enum(["cash", "upi", "card", "wallet", "bank_transfer", "other"]).optional().default("cash"),
        note: z.string().max(255).optional().nullable(),
        allow_overpay: z.boolean().optional().default(false),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

      const data = await recordBookingPayment({
        bookingId: id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        note: parsed.data.note,
        allowOverpay: parsed.data.allow_overpay,
        actor: { type: "admin", adminId: user.id },
      });
      await audit(user.id, "booking.payment", "bookings", String(id), null, data, req);
      return ok(reply, data, "Payment recorded.", 201);
    },
  );

  /** Admin directly sets payment_status (paid / partial / unpaid / refunded). */
  app.put(
    "/bookings/:id/payment-status",
    { preHandler: [requirePermission("bookings.update")] },
    async (req, reply) => {
      const user = requireUser(req);
      const id = BigInt((req.params as { id: string }).id);
      const schema = z.object({
        payment_status: z.enum(["unpaid", "partial", "paid", "refunded", "failed"]),
        note: z.string().max(255).optional().nullable(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

      const data = await setBookingPaymentStatus({
        bookingId: id,
        paymentStatus: parsed.data.payment_status,
        adminId: user.id,
        note: parsed.data.note,
      });
      await audit(user.id, "booking.payment_status", "bookings", String(id), null, data, req);
      return ok(reply, data, "Payment status updated.");
    },
  );

  app.get("/customers", { preHandler: [requirePermission("customers.view")] }, async (req, reply) => {
    const q = req.query as { page?: string; per_page?: string; q?: string };
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(q.per_page ?? 20) || 20));
    const search = q.q?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      prisma.customers.count({ where }),
      prisma.customers.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(reply, rows.map(serializeCustomer), "OK", 200, {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  });

  app.get("/customers/:id", { preHandler: [requirePermission("customers.view")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const c = await prisma.customers.findUnique({ where: { id } });
    if (!c) throw new NotFoundError("Customer not found.");
    const bookingCount = await prisma.bookings.count({ where: { customer_id: id } });
    return ok(reply, { ...serializeCustomer(c), booking_count: bookingCount });
  });

  app.put("/customers/:id", { preHandler: [requirePermission("customers.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.customers.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Customer not found.");
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional().nullable(),
      alternate_phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      preferred_language: z.enum(["en", "ta"]).optional(),
      app_status: z.enum(["active", "blocked", "deleted"]).optional(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const c = await prisma.customers.update({
      where: { id },
      data: {
        ...(d.name != null ? { name: d.name } : {}),
        ...(d.email !== undefined ? { email: d.email } : {}),
        ...(d.alternate_phone !== undefined ? { alternate_phone: d.alternate_phone } : {}),
        ...(d.address !== undefined ? { address: d.address } : {}),
        ...(d.city !== undefined ? { city: d.city } : {}),
        ...(d.preferred_language != null ? { preferred_language: d.preferred_language } : {}),
        ...(d.app_status != null ? { app_status: d.app_status } : {}),
        ...(d.is_active != null ? { is_active: d.is_active } : {}),
      },
    });
    await audit(
      user.id,
      "customer.update",
      "customers",
      String(id),
      serializeCustomer(existing),
      serializeCustomer(c),
      req,
    );
    return ok(reply, serializeCustomer(c), "Customer updated.");
  });

  app.get("/drivers", { preHandler: [requirePermission("drivers.view")] }, async (req, reply) => {
    const q = req.query as { page?: string; per_page?: string; q?: string };
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(q.per_page ?? 20) || 20));
    const search = q.q?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      prisma.drivers.count({ where }),
      prisma.drivers.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(
      reply,
      rows.map((d) => serializeDriver(d)),
      "OK",
      200,
      { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    );
  });

  app.get("/drivers/:id", { preHandler: [requirePermission("drivers.view")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const d = await prisma.drivers.findUnique({ where: { id } });
    if (!d) throw new NotFoundError();
    return ok(reply, serializeDriver(d));
  });

  app.post("/drivers", { preHandler: [requirePermission("drivers.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      name: z.string().min(2).max(120),
      phone: z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number"),
      email: z.string().email().optional().nullable(),
      password: z.string().min(8),
      license_no: z.string().max(80).optional().nullable(),
      license_expiry_date: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      verification_status: z.enum(["pending", "approved", "rejected", "blocked"]).optional(),
      availability_status: z.enum(["available", "on_trip", "on_leave", "suspended"]).optional(),
      online_status: z.enum(["offline", "online", "busy"]).optional(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

    const phone = parsed.data.phone.trim();
    const existing = await prisma.drivers.findUnique({ where: { phone } });
    if (existing) throw new ConflictError("A driver with this phone already exists.");

    const d = await prisma.drivers.create({
      data: {
        name: parsed.data.name.trim(),
        phone,
        email: parsed.data.email?.trim() || null,
        password_hash: await hashPassword(parsed.data.password),
        license_no: parsed.data.license_no?.trim() || null,
        license_expiry_date: parsed.data.license_expiry_date
          ? new Date(parsed.data.license_expiry_date)
          : null,
        address: parsed.data.address?.trim() || null,
        verification_status: parsed.data.verification_status ?? "pending",
        availability_status: parsed.data.availability_status ?? "available",
        online_status: parsed.data.online_status ?? "offline",
        is_active: parsed.data.is_active ?? true,
      },
    });
    await audit(user.id, "driver.create", "drivers", String(d.id), null, serializeDriver(d), req);
    return ok(reply, serializeDriver(d), "Driver created.", 201);
  });

  app.put("/drivers/:id", { preHandler: [requirePermission("drivers.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.drivers.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();

    const schema = z.object({
      name: z.string().min(2).max(120).optional(),
      phone: z
        .string()
        .regex(/^\d{10}$/, "Phone must be a 10-digit number")
        .optional(),
      email: z.string().email().optional().nullable(),
      is_active: z.boolean().optional(),
      password: z.string().min(8).optional(),
      license_no: z.string().max(80).optional().nullable(),
      license_expiry_date: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      verification_status: z.enum(["pending", "approved", "rejected", "blocked"]).optional(),
      availability_status: z.enum(["available", "on_trip", "on_leave", "suspended"]).optional(),
      online_status: z.enum(["offline", "online", "busy"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

    if (parsed.data.phone && parsed.data.phone.trim() !== existing.phone) {
      const clash = await prisma.drivers.findUnique({ where: { phone: parsed.data.phone.trim() } });
      if (clash) throw new ConflictError("A driver with this phone already exists.");
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name != null) data.name = parsed.data.name.trim();
    if (parsed.data.phone != null) data.phone = parsed.data.phone.trim();
    if (parsed.data.email !== undefined) data.email = parsed.data.email?.trim() || null;
    if (parsed.data.is_active != null) data.is_active = parsed.data.is_active;
    if (parsed.data.license_no !== undefined) data.license_no = parsed.data.license_no?.trim() || null;
    if (parsed.data.address !== undefined) data.address = parsed.data.address?.trim() || null;
    if (parsed.data.verification_status != null) data.verification_status = parsed.data.verification_status;
    if (parsed.data.availability_status != null) data.availability_status = parsed.data.availability_status;
    if (parsed.data.online_status != null) data.online_status = parsed.data.online_status;
    if (parsed.data.license_expiry_date !== undefined) {
      data.license_expiry_date = parsed.data.license_expiry_date
        ? new Date(parsed.data.license_expiry_date)
        : null;
    }
    if (parsed.data.password) {
      data.password_hash = await hashPassword(parsed.data.password);
    }

    const d = await prisma.drivers.update({ where: { id }, data });
    await audit(user.id, "driver.update", "drivers", String(id), serializeDriver(existing), serializeDriver(d), req);
    return ok(reply, serializeDriver(d), "Driver updated.");
  });

  app.post("/drivers/:id/photo", { preHandler: [requirePermission("drivers.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.drivers.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();

    const file = await req.file();
    if (!file) throw new ValidationError("Image file is required.");
    const mime = file.mimetype || "";
    if (!mime.startsWith("image/")) throw new ValidationError("Only image uploads are allowed.");

    const bytes = await file.toBuffer();
    try {
      await saveDriverPhotoBytes(id, bytes, mime);
    } catch (err) {
      if (err instanceof Error && err.message === "UNSUPPORTED_IMAGE") {
        throw new ValidationError("Use a JPEG, PNG, WebP, or GIF photo.");
      }
      throw err;
    }
    const relativeUrl = driverPhotoPublicPath(id);
    const d = await prisma.drivers.update({
      where: { id },
      data: { profile_image_url: relativeUrl },
    });
    return ok(reply, serializeDriver(d), "Driver photo updated.");
  });

  app.delete("/drivers/:id", { preHandler: [requirePermission("drivers.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.drivers.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    await prisma.drivers.delete({ where: { id } });
    await audit(user.id, "driver.delete", "drivers", String(id), serializeDriver(existing), null, req);
    return ok(reply, { id: String(id) }, "Driver deleted.");
  });

  app.post("/drivers/:id/approve", { preHandler: [requirePermission("drivers.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const d = await prisma.drivers.update({
      where: { id },
      data: { verification_status: "approved", is_active: true },
    });
    await audit(user.id, "driver.approve", "drivers", String(id), null, { status: "approved" }, req);
    return ok(reply, serializeDriver(d), "Driver approved.");
  });

  app.post("/drivers/:id/reject", { preHandler: [requirePermission("drivers.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const d = await prisma.drivers.update({
      where: { id },
      data: { verification_status: "rejected" },
    });
    await audit(user.id, "driver.reject", "drivers", String(id), null, { status: "rejected" }, req);
    return ok(reply, serializeDriver(d), "Driver rejected.");
  });

  app.post("/drivers/:id/block", { preHandler: [requirePermission("drivers.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const d = await prisma.drivers.update({
      where: { id },
      data: {
        verification_status: "blocked",
        availability_status: "suspended",
        online_status: "offline",
        is_active: false,
      },
    });
    await audit(user.id, "driver.block", "drivers", String(id), null, { status: "blocked" }, req);
    return ok(reply, serializeDriver(d), "Driver blocked.");
  });

  app.get("/vehicle-categories", { preHandler: [requirePermission("vehicle_categories.manage")] }, async (_req, reply) => {
    const rows = await prisma.vehicleCategories.findMany({
      orderBy: [{ display_order: "asc" }, { name: "asc" }],
      take: 200,
    });
    return ok(reply, rows.map(serializeVehicleCategory));
  });

  app.get("/vehicle-categories/:id", { preHandler: [requirePermission("vehicle_categories.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const row = await prisma.vehicleCategories.findUnique({ where: { id } });
    if (!row) throw new NotFoundError();
    return ok(reply, serializeVehicleCategory(row));
  });

  app.post("/vehicle-categories", { preHandler: [requirePermission("vehicle_categories.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      name: z.string().min(2).max(100),
      slug: z.string().min(2).max(120),
      seating_capacity: z.number().int().min(1).max(50),
      luggage_capacity: z.string().max(80).optional().nullable(),
      description: z.string().optional().nullable(),
      image_url: z.string().max(500).optional().nullable(),
      one_way_rate_per_km: z.number().nonnegative().optional(),
      round_trip_rate_per_km: z.number().nonnegative().optional(),
      driver_batta: z.number().nonnegative().optional(),
      minimum_km_per_day: z.number().nonnegative().optional(),
      display_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    try {
      const row = await prisma.vehicleCategories.create({
        data: {
          name: parsed.data.name.trim(),
          slug: parsed.data.slug.trim(),
          seating_capacity: parsed.data.seating_capacity,
          luggage_capacity: parsed.data.luggage_capacity?.trim() || null,
          description: parsed.data.description?.trim() || null,
          image_url: parsed.data.image_url?.trim() || null,
          one_way_rate_per_km: parsed.data.one_way_rate_per_km ?? 0,
          round_trip_rate_per_km: parsed.data.round_trip_rate_per_km ?? 0,
          driver_batta: parsed.data.driver_batta ?? 0,
          minimum_km_per_day: parsed.data.minimum_km_per_day ?? 0,
          display_order: parsed.data.display_order ?? 0,
          is_active: parsed.data.is_active ?? true,
        },
      });
      const serialized = serializeVehicleCategory(row);
      await audit(user.id, "vehicle_category.create", "vehicle_categories", String(row.id), null, serialized, req);
      return ok(reply, serialized, "Vehicle category created.", 201);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        throw new ConflictError("A category with this slug already exists.");
      }
      throw err;
    }
  });

  app.put("/vehicle-categories/:id", { preHandler: [requirePermission("vehicle_categories.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.vehicleCategories.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      slug: z.string().min(2).max(120).optional(),
      seating_capacity: z.number().int().min(1).max(50).optional(),
      luggage_capacity: z.string().max(80).optional().nullable(),
      description: z.string().optional().nullable(),
      image_url: z.string().max(500).optional().nullable(),
      one_way_rate_per_km: z.number().nonnegative().optional(),
      round_trip_rate_per_km: z.number().nonnegative().optional(),
      driver_batta: z.number().nonnegative().optional(),
      minimum_km_per_day: z.number().nonnegative().optional(),
      display_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    try {
      const row = await prisma.vehicleCategories.update({
        where: { id },
        data: {
          ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
          ...(parsed.data.slug != null ? { slug: parsed.data.slug.trim() } : {}),
          ...(parsed.data.seating_capacity != null ? { seating_capacity: parsed.data.seating_capacity } : {}),
          ...(parsed.data.luggage_capacity !== undefined
            ? { luggage_capacity: parsed.data.luggage_capacity?.trim() || null }
            : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description?.trim() || null }
            : {}),
          ...(parsed.data.image_url !== undefined ? { image_url: parsed.data.image_url?.trim() || null } : {}),
          ...(parsed.data.one_way_rate_per_km != null
            ? { one_way_rate_per_km: parsed.data.one_way_rate_per_km }
            : {}),
          ...(parsed.data.round_trip_rate_per_km != null
            ? { round_trip_rate_per_km: parsed.data.round_trip_rate_per_km }
            : {}),
          ...(parsed.data.driver_batta != null ? { driver_batta: parsed.data.driver_batta } : {}),
          ...(parsed.data.minimum_km_per_day != null
            ? { minimum_km_per_day: parsed.data.minimum_km_per_day }
            : {}),
          ...(parsed.data.display_order != null ? { display_order: parsed.data.display_order } : {}),
          ...(parsed.data.is_active != null ? { is_active: parsed.data.is_active } : {}),
        },
      });
      const serialized = serializeVehicleCategory(row);
      await audit(
        user.id,
        "vehicle_category.update",
        "vehicle_categories",
        String(id),
        serializeVehicleCategory(existing),
        serialized,
        req,
      );
      return ok(reply, serialized, "Vehicle category updated.");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        throw new ConflictError("A category with this slug already exists.");
      }
      throw err;
    }
  });

  app.delete("/vehicle-categories/:id", { preHandler: [requirePermission("vehicle_categories.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.vehicleCategories.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    const inUse = await prisma.vehicles.count({ where: { category_id: id } });
    if (inUse > 0) {
      throw new ConflictError(`Cannot delete: ${inUse} vehicle(s) still use this category.`);
    }
    await prisma.vehicleCategories.delete({ where: { id } });
    await audit(user.id, "vehicle_category.delete", "vehicle_categories", String(id), serializeVehicleCategory(existing), null, req);
    return ok(reply, { id: String(id) }, "Vehicle category deleted.");
  });

  app.get("/vehicles", { preHandler: [requirePermission("vehicles.manage")] }, async (_req, reply) => {
    const rows = await prisma.vehicles.findMany({ orderBy: { id: "desc" }, take: 500 });
    const categoryIds = [...new Set(rows.map((v) => v.category_id))];
    const categories = categoryIds.length
      ? await prisma.vehicleCategories.findMany({ where: { id: { in: categoryIds } } })
      : [];
    const categoryMap = new Map(categories.map((c) => [String(c.id), c.name]));
    return ok(
      reply,
      rows.map((v) => serializeVehicle(v, categoryMap.get(String(v.category_id)) ?? null)),
    );
  });

  app.get("/vehicles/:id", { preHandler: [requirePermission("vehicles.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const v = await prisma.vehicles.findUnique({ where: { id } });
    if (!v) throw new NotFoundError();
    const category = await prisma.vehicleCategories.findUnique({ where: { id: v.category_id } });
    return ok(reply, serializeVehicle(v, category?.name ?? null));
  });

  app.post("/vehicles", { preHandler: [requirePermission("vehicles.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      category_id: z.union([z.string(), z.number()]),
      vehicle_name: z.string().min(1).max(120),
      registration_no: z.string().max(50).optional().nullable(),
      model_name: z.string().max(120).optional().nullable(),
      color: z.string().max(60).optional().nullable(),
      fuel_type: z.enum(["petrol", "diesel", "cng", "electric", "hybrid", "other"]).optional(),
      rc_expiry_date: z.string().optional().nullable(),
      insurance_expiry_date: z.string().optional().nullable(),
      permit_expiry_date: z.string().optional().nullable(),
      pollution_expiry_date: z.string().optional().nullable(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const category = await prisma.vehicleCategories.findUnique({
      where: { id: BigInt(parsed.data.category_id) },
    });
    if (!category) throw new ValidationError("Invalid vehicle category.");
    try {
      const v = await prisma.vehicles.create({
        data: {
          category_id: BigInt(parsed.data.category_id),
          vehicle_name: parsed.data.vehicle_name.trim(),
          registration_no: parsed.data.registration_no?.trim() || null,
          model_name: parsed.data.model_name?.trim() || null,
          color: parsed.data.color?.trim() || null,
          fuel_type: parsed.data.fuel_type ?? "diesel",
          rc_expiry_date: parsed.data.rc_expiry_date ? new Date(parsed.data.rc_expiry_date) : null,
          insurance_expiry_date: parsed.data.insurance_expiry_date
            ? new Date(parsed.data.insurance_expiry_date)
            : null,
          permit_expiry_date: parsed.data.permit_expiry_date
            ? new Date(parsed.data.permit_expiry_date)
            : null,
          pollution_expiry_date: parsed.data.pollution_expiry_date
            ? new Date(parsed.data.pollution_expiry_date)
            : null,
          is_active: parsed.data.is_active ?? true,
        },
      });
      const serialized = serializeVehicle(v, category.name);
      await audit(user.id, "vehicle.create", "vehicles", String(v.id), null, serialized, req);
      return ok(reply, serialized, "Vehicle created.", 201);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        throw new ConflictError("A vehicle with this registration number already exists.");
      }
      throw err;
    }
  });

  app.put("/vehicles/:id", { preHandler: [requirePermission("vehicles.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.vehicles.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    const schema = z.object({
      category_id: z.union([z.string(), z.number()]).optional(),
      vehicle_name: z.string().min(1).max(120).optional(),
      registration_no: z.string().max(50).optional().nullable(),
      model_name: z.string().max(120).optional().nullable(),
      color: z.string().max(60).optional().nullable(),
      fuel_type: z.enum(["petrol", "diesel", "cng", "electric", "hybrid", "other"]).optional(),
      rc_expiry_date: z.string().optional().nullable(),
      insurance_expiry_date: z.string().optional().nullable(),
      permit_expiry_date: z.string().optional().nullable(),
      pollution_expiry_date: z.string().optional().nullable(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

    let categoryName: string | null = null;
    if (parsed.data.category_id != null) {
      const category = await prisma.vehicleCategories.findUnique({
        where: { id: BigInt(parsed.data.category_id) },
      });
      if (!category) throw new ValidationError("Invalid vehicle category.");
      categoryName = category.name;
    } else {
      const category = await prisma.vehicleCategories.findUnique({ where: { id: existing.category_id } });
      categoryName = category?.name ?? null;
    }

    try {
      const v = await prisma.vehicles.update({
        where: { id },
        data: {
          ...(parsed.data.category_id != null ? { category_id: BigInt(parsed.data.category_id) } : {}),
          ...(parsed.data.vehicle_name != null ? { vehicle_name: parsed.data.vehicle_name.trim() } : {}),
          ...(parsed.data.registration_no !== undefined
            ? { registration_no: parsed.data.registration_no?.trim() || null }
            : {}),
          ...(parsed.data.model_name !== undefined
            ? { model_name: parsed.data.model_name?.trim() || null }
            : {}),
          ...(parsed.data.color !== undefined ? { color: parsed.data.color?.trim() || null } : {}),
          ...(parsed.data.fuel_type != null ? { fuel_type: parsed.data.fuel_type } : {}),
          ...(parsed.data.rc_expiry_date !== undefined
            ? { rc_expiry_date: parsed.data.rc_expiry_date ? new Date(parsed.data.rc_expiry_date) : null }
            : {}),
          ...(parsed.data.insurance_expiry_date !== undefined
            ? {
                insurance_expiry_date: parsed.data.insurance_expiry_date
                  ? new Date(parsed.data.insurance_expiry_date)
                  : null,
              }
            : {}),
          ...(parsed.data.permit_expiry_date !== undefined
            ? {
                permit_expiry_date: parsed.data.permit_expiry_date
                  ? new Date(parsed.data.permit_expiry_date)
                  : null,
              }
            : {}),
          ...(parsed.data.pollution_expiry_date !== undefined
            ? {
                pollution_expiry_date: parsed.data.pollution_expiry_date
                  ? new Date(parsed.data.pollution_expiry_date)
                  : null,
              }
            : {}),
          ...(parsed.data.is_active != null ? { is_active: parsed.data.is_active } : {}),
        },
      });
      const serialized = serializeVehicle(v, categoryName);
      await audit(user.id, "vehicle.update", "vehicles", String(id), serializeVehicle(existing), serialized, req);
      return ok(reply, serialized, "Vehicle updated.");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        throw new ConflictError("A vehicle with this registration number already exists.");
      }
      throw err;
    }
  });

  app.delete("/vehicles/:id", { preHandler: [requirePermission("vehicles.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.vehicles.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    await prisma.vehicles.delete({ where: { id } });
    await audit(user.id, "vehicle.delete", "vehicles", String(id), serializeVehicle(existing), null, req);
    return ok(reply, { id: String(id) }, "Vehicle deleted.");
  });

  app.get("/driver-assignments", { preHandler: [requirePermission("driver_assignments.manage")] }, async (req, reply) => {
    const q = req.query as { page?: string; per_page?: string; current?: string };
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(q.per_page ?? 100) || 100));
    const currentOnly = q.current === "1" || q.current === "true";
    const where = currentOnly ? { is_current: true } : {};
    const [total, rows] = await Promise.all([
      prisma.driverVehicleAssignments.count({ where }),
      prisma.driverVehicleAssignments.findMany({
        where,
        orderBy: [{ is_current: "desc" }, { assigned_from: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    const driverIds = [...new Set(rows.map((r) => r.driver_id))];
    const vehicleIds = [...new Set(rows.map((r) => r.vehicle_id))];
    const [drivers, vehicles] = await Promise.all([
      driverIds.length
        ? prisma.drivers.findMany({
            where: { id: { in: driverIds } },
            select: { id: true, name: true, phone: true },
          })
        : Promise.resolve([]),
      vehicleIds.length
        ? prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, vehicle_name: true, registration_no: true },
          })
        : Promise.resolve([]),
    ]);
    const driverMap = new Map(drivers.map((d) => [String(d.id), d]));
    const vehicleMap = new Map(vehicles.map((v) => [String(v.id), v]));
    return ok(
      reply,
      rows.map((a) => {
        const d = driverMap.get(String(a.driver_id));
        const v = vehicleMap.get(String(a.vehicle_id));
        return serializeAssignment(a, {
          driver_name: d?.name ?? null,
          driver_phone: d?.phone ?? null,
          vehicle_name: v?.vehicle_name ?? null,
          registration_no: v?.registration_no ?? null,
        });
      }),
      "Assignments fetched.",
      200,
      { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    );
  });

  app.get("/driver-assignments/:id", { preHandler: [requirePermission("driver_assignments.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const a = await prisma.driverVehicleAssignments.findUnique({ where: { id } });
    if (!a) throw new NotFoundError("Assignment not found.");
    const [driver, vehicle] = await Promise.all([
      prisma.drivers.findUnique({ where: { id: a.driver_id }, select: { name: true, phone: true } }),
      prisma.vehicles.findUnique({
        where: { id: a.vehicle_id },
        select: { vehicle_name: true, registration_no: true },
      }),
    ]);
    return ok(
      reply,
      serializeAssignment(a, {
        driver_name: driver?.name ?? null,
        driver_phone: driver?.phone ?? null,
        vehicle_name: vehicle?.vehicle_name ?? null,
        registration_no: vehicle?.registration_no ?? null,
      }),
    );
  });

  app.post("/driver-assignments", { preHandler: [requirePermission("driver_assignments.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      driver_id: z.union([z.string(), z.number()]),
      vehicle_id: z.union([z.string(), z.number()]),
      assigned_from: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const driverId = BigInt(parsed.data.driver_id);
    const vehicleId = BigInt(parsed.data.vehicle_id);
    const assignedFrom = parsed.data.assigned_from ? new Date(parsed.data.assigned_from) : new Date();
    if (Number.isNaN(assignedFrom.getTime())) throw new ValidationError("Invalid assigned_from date.");

    const [driver, vehicle] = await Promise.all([
      prisma.drivers.findUnique({ where: { id: driverId }, select: { id: true, name: true, phone: true } }),
      prisma.vehicles.findUnique({
        where: { id: vehicleId },
        select: { id: true, vehicle_name: true, registration_no: true, is_active: true },
      }),
    ]);
    if (!driver) throw new ValidationError("Driver not found.");
    if (!vehicle) throw new ValidationError("Vehicle not found.");
    if (!vehicle.is_active) throw new ValidationError("Vehicle is not active.");

    const row = await prisma.$transaction(async (tx) => {
      await endCurrentAssignments(tx, { driver_id: driverId }, assignedFrom);
      await endCurrentAssignments(tx, { vehicle_id: vehicleId }, assignedFrom);
      return tx.driverVehicleAssignments.create({
        data: {
          driver_id: driverId,
          vehicle_id: vehicleId,
          assigned_from: assignedFrom,
          is_current: true,
        },
      });
    });

    const serialized = serializeAssignment(row, {
      driver_name: driver.name,
      driver_phone: driver.phone,
      vehicle_name: vehicle.vehicle_name,
      registration_no: vehicle.registration_no,
    });
    await audit(user.id, "assignment.create", "driver_vehicle_assignments", String(row.id), null, serialized, req);
    return ok(reply, serialized, "Driver assigned to vehicle.", 201);
  });

  app.post("/driver-assignments/:id/end", { preHandler: [requirePermission("driver_assignments.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.driverVehicleAssignments.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Assignment not found.");
    if (!existing.is_current) throw new ConflictError("Assignment already ended.");

    const ended = await prisma.driverVehicleAssignments.update({
      where: { id },
      data: {
        is_current: false,
        assigned_to: assignmentEndAt(existing.assigned_from, new Date()),
      },
    });
    const [driver, vehicle] = await Promise.all([
      prisma.drivers.findUnique({ where: { id: ended.driver_id }, select: { name: true, phone: true } }),
      prisma.vehicles.findUnique({
        where: { id: ended.vehicle_id },
        select: { vehicle_name: true, registration_no: true },
      }),
    ]);
    const serialized = serializeAssignment(ended, {
      driver_name: driver?.name ?? null,
      driver_phone: driver?.phone ?? null,
      vehicle_name: vehicle?.vehicle_name ?? null,
      registration_no: vehicle?.registration_no ?? null,
    });
    await audit(
      user.id,
      "assignment.end",
      "driver_vehicle_assignments",
      String(id),
      serializeAssignment(existing),
      serialized,
      req,
    );
    return ok(reply, serialized, "Assignment ended.");
  });

  app.post("/uploads", async (req, reply) => {
    const env = loadEnv();
    const file = await req.file();
    if (!file) throw new ValidationError("Image file is required.");
    const mime = file.mimetype || "";
    if (!mime.startsWith("image/")) throw new ValidationError("Only image uploads are allowed.");

    const extFromName = path.extname(file.filename || "").toLowerCase();
    const ext =
      extFromName && [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extFromName)
        ? extFromName
        : mime === "image/png"
          ? ".png"
          : mime === "image/webp"
            ? ".webp"
            : mime === "image/gif"
              ? ".gif"
              : ".jpg";

    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const dir = path.resolve(env.STORAGE_PATH, "public", "routes");
    fs.mkdirSync(dir, { recursive: true });
    const fullPath = path.join(dir, filename);
    await fs.promises.writeFile(fullPath, await file.toBuffer());

    const relativeUrl = `/storage/public/routes/${filename}`;
    const absoluteUrl = `${env.APP_URL.replace(/\/$/, "")}${relativeUrl}`;
    return ok(reply, { url: absoluteUrl, path: relativeUrl }, "Image uploaded.", 201);
  });

  app.get("/cities", { preHandler: [requirePermission("routes.manage")] }, async (_req, reply) => {
    const rows = await prisma.cities.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      take: 500,
    });
    return ok(
      reply,
      rows.map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        state: c.state,
        is_airport: c.is_airport,
      })),
    );
  });

  app.get("/routes", { preHandler: [requirePermission("routes.manage")] }, async (_req, reply) => {
    const rows = await prisma.routes.findMany({
      orderBy: [{ is_popular: "desc" }, { title: "asc" }],
      take: 500,
    });
    const cityIds = [...new Set(rows.flatMap((r) => [r.pickup_city_id, r.drop_city_id]))];
    const cities = cityIds.length
      ? await prisma.cities.findMany({ where: { id: { in: cityIds } } })
      : [];
    const cityMap = new Map(cities.map((c) => [String(c.id), c.name]));
    return ok(
      reply,
      rows.map((r) =>
        serializeRoute(r, {
          pickup_city_name: cityMap.get(String(r.pickup_city_id)) ?? null,
          drop_city_name: cityMap.get(String(r.drop_city_id)) ?? null,
        }),
      ),
    );
  });

  app.get("/routes/:id", { preHandler: [requirePermission("routes.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const r = await prisma.routes.findUnique({ where: { id } });
    if (!r) throw new NotFoundError();
    const cities = await prisma.cities.findMany({
      where: { id: { in: [r.pickup_city_id, r.drop_city_id] } },
    });
    const cityMap = new Map(cities.map((c) => [String(c.id), c.name]));
    return ok(
      reply,
      serializeRoute(r, {
        pickup_city_name: cityMap.get(String(r.pickup_city_id)) ?? null,
        drop_city_name: cityMap.get(String(r.drop_city_id)) ?? null,
      }),
    );
  });

  app.post("/routes", { preHandler: [requirePermission("routes.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      pickup_city_id: z.union([z.string(), z.number()]),
      drop_city_id: z.union([z.string(), z.number()]),
      slug: z.string().min(3).max(180),
      title: z.string().min(3).max(180),
      distance_km: z.number().nonnegative(),
      duration_minutes: z.number().int().nonnegative().optional().nullable(),
      content: z.string().optional().nullable(),
      faq_content: z.string().optional().nullable(),
      route_map_embed_url: z.string().optional().nullable(),
      image_url: z.string().max(500).optional().nullable(),
      amount: z.number().nonnegative().optional().nullable(),
      is_popular: z.boolean().optional(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    if (String(parsed.data.pickup_city_id) === String(parsed.data.drop_city_id)) {
      throw new ValidationError("Pickup and drop cities must be different.");
    }
    const pickup = await prisma.cities.findUnique({ where: { id: BigInt(parsed.data.pickup_city_id) } });
    const drop = await prisma.cities.findUnique({ where: { id: BigInt(parsed.data.drop_city_id) } });
    if (!pickup || !drop) throw new ValidationError("Invalid pickup or drop city.");

    try {
      const r = await prisma.routes.create({
        data: {
          pickup_city_id: BigInt(parsed.data.pickup_city_id),
          drop_city_id: BigInt(parsed.data.drop_city_id),
          slug: parsed.data.slug.trim(),
          title: parsed.data.title.trim(),
          distance_km: parsed.data.distance_km,
          duration_minutes: parsed.data.duration_minutes ?? null,
          content: parsed.data.content?.trim() || null,
          faq_content: parsed.data.faq_content?.trim() || null,
          route_map_embed_url: parsed.data.route_map_embed_url?.trim() || null,
          image_url: parsed.data.image_url?.trim() || null,
          amount: parsed.data.amount ?? null,
          is_popular: parsed.data.is_popular ?? false,
          is_active: parsed.data.is_active ?? true,
        },
      });
      const serialized = serializeRoute(r, {
        pickup_city_name: pickup.name,
        drop_city_name: drop.name,
      });
      await audit(user.id, "route.create", "routes", String(r.id), null, serialized, req);
      return ok(reply, serialized, "Route created.", 201);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        throw new ConflictError("A route with this slug or city pair already exists.");
      }
      throw err;
    }
  });

  app.put("/routes/:id", { preHandler: [requirePermission("routes.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.routes.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();

    const schema = z.object({
      pickup_city_id: z.union([z.string(), z.number()]).optional(),
      drop_city_id: z.union([z.string(), z.number()]).optional(),
      slug: z.string().min(3).max(180).optional(),
      title: z.string().min(3).max(180).optional(),
      distance_km: z.number().nonnegative().optional(),
      duration_minutes: z.number().int().nonnegative().optional().nullable(),
      content: z.string().optional().nullable(),
      faq_content: z.string().optional().nullable(),
      route_map_embed_url: z.string().optional().nullable(),
      image_url: z.string().max(500).optional().nullable(),
      amount: z.number().nonnegative().optional().nullable(),
      is_active: z.boolean().optional(),
      is_popular: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

    const pickupId = parsed.data.pickup_city_id != null ? BigInt(parsed.data.pickup_city_id) : existing.pickup_city_id;
    const dropId = parsed.data.drop_city_id != null ? BigInt(parsed.data.drop_city_id) : existing.drop_city_id;
    if (pickupId === dropId) throw new ValidationError("Pickup and drop cities must be different.");

    try {
      const r = await prisma.routes.update({
        where: { id },
        data: {
          ...(parsed.data.pickup_city_id != null ? { pickup_city_id: pickupId } : {}),
          ...(parsed.data.drop_city_id != null ? { drop_city_id: dropId } : {}),
          ...(parsed.data.slug != null ? { slug: parsed.data.slug.trim() } : {}),
          ...(parsed.data.title != null ? { title: parsed.data.title.trim() } : {}),
          ...(parsed.data.distance_km != null ? { distance_km: parsed.data.distance_km } : {}),
          ...(parsed.data.duration_minutes !== undefined
            ? { duration_minutes: parsed.data.duration_minutes }
            : {}),
          ...(parsed.data.content !== undefined ? { content: parsed.data.content?.trim() || null } : {}),
          ...(parsed.data.faq_content !== undefined
            ? { faq_content: parsed.data.faq_content?.trim() || null }
            : {}),
          ...(parsed.data.route_map_embed_url !== undefined
            ? { route_map_embed_url: parsed.data.route_map_embed_url?.trim() || null }
            : {}),
          ...(parsed.data.image_url !== undefined
            ? { image_url: parsed.data.image_url?.trim() || null }
            : {}),
          ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
          ...(parsed.data.is_active != null ? { is_active: parsed.data.is_active } : {}),
          ...(parsed.data.is_popular != null ? { is_popular: parsed.data.is_popular } : {}),
        },
      });
      const cities = await prisma.cities.findMany({
        where: { id: { in: [r.pickup_city_id, r.drop_city_id] } },
      });
      const cityMap = new Map(cities.map((c) => [String(c.id), c.name]));
      const serialized = serializeRoute(r, {
        pickup_city_name: cityMap.get(String(r.pickup_city_id)) ?? null,
        drop_city_name: cityMap.get(String(r.drop_city_id)) ?? null,
      });
      await audit(user.id, "route.update", "routes", String(id), serializeRoute(existing), serialized, req);
      return ok(reply, serialized, "Route updated.");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        throw new ConflictError("A route with this slug or city pair already exists.");
      }
      throw err;
    }
  });

  app.delete("/routes/:id", { preHandler: [requirePermission("routes.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.routes.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    await prisma.routes.delete({ where: { id } });
    await audit(user.id, "route.delete", "routes", String(id), serializeRoute(existing), null, req);
    return ok(reply, { id: String(id) }, "Route deleted.");
  });

  app.get("/tariffs", { preHandler: [requirePermission("tariff.manage")] }, async (_req, reply) => {
    const rows = await prisma.tariffPlans.findMany({ take: 500, orderBy: { id: "desc" } });
    const categoryIds = [...new Set(rows.map((t) => t.vehicle_category_id))];
    const routeIds = [...new Set(rows.map((t) => t.route_id).filter((id): id is bigint => id != null))];
    const [categories, routes] = await Promise.all([
      categoryIds.length
        ? prisma.vehicleCategories.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      routeIds.length
        ? prisma.routes.findMany({
            where: { id: { in: routeIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ]);
    const categoryName = new Map(categories.map((c) => [String(c.id), c.name]));
    const routeTitle = new Map(routes.map((r) => [String(r.id), r.title]));
    return ok(
      reply,
      rows.map((t) =>
        serializeTariff(t, {
          category_name: categoryName.get(String(t.vehicle_category_id)) ?? null,
          route_title: t.route_id != null ? routeTitle.get(String(t.route_id)) ?? null : null,
        }),
      ),
    );
  });

  app.get("/tariffs/:id", { preHandler: [requirePermission("tariff.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const t = await prisma.tariffPlans.findUnique({ where: { id } });
    if (!t) throw new NotFoundError("Tariff not found.");
    const [category, route] = await Promise.all([
      prisma.vehicleCategories.findUnique({
        where: { id: t.vehicle_category_id },
        select: { name: true },
      }),
      t.route_id
        ? prisma.routes.findUnique({ where: { id: t.route_id }, select: { title: true } })
        : Promise.resolve(null),
    ]);
    return ok(
      reply,
      serializeTariff(t, {
        category_name: category?.name ?? null,
        route_title: route?.title ?? null,
      }),
    );
  });

  app.post("/tariffs", { preHandler: [requirePermission("tariff.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      vehicle_category_id: z.union([z.string(), z.number()]),
      trip_type: z.enum(["one_way", "round_trip", "airport", "outstation", "local_rental"]),
      route_id: z.union([z.string(), z.number()]).optional().nullable(),
      rate_per_km: z.number().nonnegative(),
      base_fare: z.number().nonnegative().default(0),
      driver_batta: z.number().nonnegative().default(0),
      minimum_km: z.number().nonnegative().default(0),
      minimum_fare: z.number().nonnegative().default(0),
      extra_km_rate: z.number().nonnegative().default(0),
      extra_hour_rate: z.number().nonnegative().default(0),
      night_charge: z.number().nonnegative().default(0),
      waiting_charge_per_hour: z.number().nonnegative().default(0),
      permit_charge: z.number().nonnegative().default(0),
      toll_included: z.boolean().default(false),
      parking_included: z.boolean().default(false),
      gst_percentage: z.number().min(0).max(100).default(0),
      effective_from: z.string().min(1),
      effective_to: z.string().optional().nullable(),
      is_active: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const category = await prisma.vehicleCategories.findUnique({
      where: { id: BigInt(d.vehicle_category_id) },
      select: { id: true },
    });
    if (!category) throw new ValidationError("Vehicle category not found.");
    if (d.route_id != null && d.route_id !== "") {
      const route = await prisma.routes.findUnique({
        where: { id: BigInt(d.route_id) },
        select: { id: true },
      });
      if (!route) throw new ValidationError("Route not found.");
    }
    const t = await prisma.tariffPlans.create({
      data: {
        vehicle_category_id: BigInt(d.vehicle_category_id),
        trip_type: d.trip_type,
        route_id: d.route_id != null && d.route_id !== "" ? BigInt(d.route_id) : null,
        rate_per_km: d.rate_per_km,
        base_fare: d.base_fare,
        driver_batta: d.driver_batta,
        minimum_km: d.minimum_km,
        minimum_fare: d.minimum_fare,
        extra_km_rate: d.extra_km_rate,
        extra_hour_rate: d.extra_hour_rate,
        night_charge: d.night_charge,
        waiting_charge_per_hour: d.waiting_charge_per_hour,
        permit_charge: d.permit_charge,
        toll_included: d.toll_included,
        parking_included: d.parking_included,
        gst_percentage: d.gst_percentage,
        effective_from: new Date(d.effective_from),
        effective_to: d.effective_to ? new Date(d.effective_to) : null,
        is_active: d.is_active,
      },
    });
    await audit(user.id, "tariff.create", "tariff_plans", String(t.id), null, { id: String(t.id) }, req);
    return ok(reply, serializeTariff(t), "Tariff created.", 201);
  });

  app.put("/tariffs/:id", { preHandler: [requirePermission("tariff.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.tariffPlans.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Tariff not found.");
    const schema = z.object({
      vehicle_category_id: z.union([z.string(), z.number()]).optional(),
      trip_type: z.enum(["one_way", "round_trip", "airport", "outstation", "local_rental"]).optional(),
      route_id: z.union([z.string(), z.number()]).optional().nullable(),
      rate_per_km: z.number().nonnegative().optional(),
      base_fare: z.number().nonnegative().optional(),
      driver_batta: z.number().nonnegative().optional(),
      minimum_km: z.number().nonnegative().optional(),
      minimum_fare: z.number().nonnegative().optional(),
      extra_km_rate: z.number().nonnegative().optional(),
      extra_hour_rate: z.number().nonnegative().optional(),
      night_charge: z.number().nonnegative().optional(),
      waiting_charge_per_hour: z.number().nonnegative().optional(),
      permit_charge: z.number().nonnegative().optional(),
      toll_included: z.boolean().optional(),
      parking_included: z.boolean().optional(),
      gst_percentage: z.number().min(0).max(100).optional(),
      effective_from: z.string().optional(),
      effective_to: z.string().optional().nullable(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    if (d.vehicle_category_id != null) {
      const category = await prisma.vehicleCategories.findUnique({
        where: { id: BigInt(d.vehicle_category_id) },
        select: { id: true },
      });
      if (!category) throw new ValidationError("Vehicle category not found.");
    }
    if (d.route_id != null && d.route_id !== "") {
      const route = await prisma.routes.findUnique({
        where: { id: BigInt(d.route_id) },
        select: { id: true },
      });
      if (!route) throw new ValidationError("Route not found.");
    }
    const t = await prisma.tariffPlans.update({
      where: { id },
      data: {
        ...(d.vehicle_category_id != null
          ? { vehicle_category_id: BigInt(d.vehicle_category_id) }
          : {}),
        ...(d.trip_type != null ? { trip_type: d.trip_type } : {}),
        ...(d.route_id !== undefined
          ? { route_id: d.route_id != null && d.route_id !== "" ? BigInt(d.route_id) : null }
          : {}),
        ...(d.rate_per_km != null ? { rate_per_km: d.rate_per_km } : {}),
        ...(d.base_fare != null ? { base_fare: d.base_fare } : {}),
        ...(d.driver_batta != null ? { driver_batta: d.driver_batta } : {}),
        ...(d.minimum_km != null ? { minimum_km: d.minimum_km } : {}),
        ...(d.minimum_fare != null ? { minimum_fare: d.minimum_fare } : {}),
        ...(d.extra_km_rate != null ? { extra_km_rate: d.extra_km_rate } : {}),
        ...(d.extra_hour_rate != null ? { extra_hour_rate: d.extra_hour_rate } : {}),
        ...(d.night_charge != null ? { night_charge: d.night_charge } : {}),
        ...(d.waiting_charge_per_hour != null
          ? { waiting_charge_per_hour: d.waiting_charge_per_hour }
          : {}),
        ...(d.permit_charge != null ? { permit_charge: d.permit_charge } : {}),
        ...(d.toll_included != null ? { toll_included: d.toll_included } : {}),
        ...(d.parking_included != null ? { parking_included: d.parking_included } : {}),
        ...(d.gst_percentage != null ? { gst_percentage: d.gst_percentage } : {}),
        ...(d.effective_from != null ? { effective_from: new Date(d.effective_from) } : {}),
        ...(d.effective_to !== undefined
          ? { effective_to: d.effective_to ? new Date(d.effective_to) : null }
          : {}),
        ...(d.is_active != null ? { is_active: d.is_active } : {}),
      },
    });
    await audit(user.id, "tariff.update", "tariff_plans", String(id), serializeTariff(existing), serializeTariff(t), req);
    return ok(reply, serializeTariff(t), "Tariff updated.");
  });

  app.delete("/tariffs/:id", { preHandler: [requirePermission("tariff.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.tariffPlans.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Tariff not found.");
    await prisma.tariffPlans.delete({ where: { id } });
    await audit(user.id, "tariff.delete", "tariff_plans", String(id), serializeTariff(existing), null, req);
    return ok(reply, { id: String(id) }, "Tariff deleted.");
  });

  app.get("/coupons", { preHandler: [requirePermission("coupons.manage")] }, async (_req, reply) => {
    const rows = await prisma.coupons.findMany({ orderBy: { id: "desc" }, take: 100 });
    return ok(
      reply,
      rows.map((c) => ({
        id: String(c.id),
        code: c.code,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        is_active: c.is_active,
      })),
    );
  });

  app.post("/coupons", { preHandler: [requirePermission("coupons.manage")] }, async (req, reply) => {
    const schema = z.object({
      code: z.string().min(3),
      title: z.string().min(2),
      discount_type: z.enum(["flat", "percentage"]),
      discount_value: z.number().positive(),
      valid_from: z.string(),
      valid_to: z.string(),
      max_discount_amount: z.number().optional().nullable(),
      min_booking_amount: z.number().optional(),
      usage_limit: z.number().int().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const c = await prisma.coupons.create({
      data: {
        code: parsed.data.code,
        title: parsed.data.title,
        discount_type: parsed.data.discount_type,
        discount_value: parsed.data.discount_value,
        valid_from: new Date(parsed.data.valid_from),
        valid_to: new Date(parsed.data.valid_to),
        max_discount_amount: parsed.data.max_discount_amount ?? null,
        min_booking_amount: parsed.data.min_booking_amount ?? 0,
        usage_limit: parsed.data.usage_limit ?? null,
      },
    });
    return ok(reply, { id: String(c.id) }, "Coupon created.", 201);
  });

  app.put("/coupons/:id", { preHandler: [requirePermission("coupons.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      title: z.string().optional(),
      is_active: z.boolean().optional(),
      discount_value: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.coupons.update({ where: { id }, data: parsed.data });
    return ok(reply, { id: String(id) }, "Coupon updated.");
  });

  app.get("/payments", { preHandler: [requirePermission("payments.view")] }, async (_req, reply) => {
    const rows = await prisma.payments.findMany({ orderBy: { created_at: "desc" }, take: 100 });
    return ok(
      reply,
      rows.map((p) => ({
        id: String(p.id),
        booking_id: String(p.booking_id),
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
      })),
    );
  });

  app.get("/invoices", { preHandler: [requirePermission("invoices.manage")] }, async (_req, reply) => {
    const rows = await prisma.bookingInvoices.findMany({ orderBy: { created_at: "desc" }, take: 100 });
    return ok(
      reply,
      rows.map((i) => ({
        id: String(i.id),
        booking_id: String(i.booking_id),
        invoice_number: i.invoice_number,
        total_amount: Number(i.total_amount),
        status: i.status,
      })),
    );
  });

  app.get("/wallet", { preHandler: [requirePermission("driver_wallet.manage")] }, async (_req, reply) => {
    const rows = await prisma.driverWalletTransactions.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
    });
    return ok(
      reply,
      rows.map((t) => ({
        id: String(t.id),
        driver_id: String(t.driver_id),
        amount: Number(t.amount),
        transaction_type: t.transaction_type,
        source_type: t.source_type,
      })),
    );
  });

  app.get("/payouts", { preHandler: [requirePermission("driver_payouts.manage")] }, async (_req, reply) => {
    const rows = await prisma.driverPayouts.findMany({ orderBy: { created_at: "desc" }, take: 100 });
    return ok(
      reply,
      rows.map((p) => ({
        id: String(p.id),
        driver_id: String(p.driver_id),
        amount: Number(p.amount),
        status: p.status,
      })),
    );
  });

  for (const action of ["approve", "reject", "mark-paid"] as const) {
    app.post(
      `/payouts/:id/${action}`,
      { preHandler: [requirePermission("driver_payouts.manage")] },
      async (req, reply) => {
        const user = requireUser(req);
        const id = BigInt((req.params as { id: string }).id);
        const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "paid";
        const p = await prisma.driverPayouts.update({
          where: { id },
          data: {
            status,
            approved_by_admin_id: user.id,
            approved_at: new Date(),
            ...(status === "paid" ? { paid_at: new Date() } : {}),
            ...(status === "rejected"
              ? { rejection_reason: (req.body as { reason?: string } | null)?.reason ?? "Rejected" }
              : {}),
          },
        });
        await audit(user.id, `payout.${action}`, "driver_payouts", String(id), null, { status }, req);
        return ok(reply, { id: String(p.id), status: p.status }, `Payout ${action}.`);
      },
    );
  }

  app.get("/reviews", { preHandler: [requirePermission("reviews.approve")] }, async (req, reply) => {
    const q = req.query as { page?: string; per_page?: string };
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(q.per_page ?? 100) || 100));
    const [total, rows] = await Promise.all([
      prisma.testimonials.count(),
      prisma.testimonials.findMany({
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(
      reply,
      rows.map((t) => serializeTestimonial(t)),
      "Testimonials fetched.",
      200,
      { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    );
  });

  app.get("/reviews/:id", { preHandler: [requirePermission("reviews.approve")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const t = await prisma.testimonials.findUnique({ where: { id } });
    if (!t) throw new NotFoundError("Testimonial not found.");
    return ok(reply, serializeTestimonial(t));
  });

  app.post("/reviews", { preHandler: [requirePermission("reviews.approve")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      customer_name: z.string().min(2).max(120),
      customer_phone: z.string().max(20).optional().nullable(),
      rating: z.number().int().min(1).max(5),
      review: z.string().min(2),
      is_featured: z.boolean().optional(),
      approval_status: z.enum(["pending", "approved", "rejected"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const status = d.approval_status ?? "approved";
    const t = await prisma.testimonials.create({
      data: {
        customer_name: d.customer_name,
        customer_phone: d.customer_phone ?? null,
        rating: d.rating,
        review: d.review,
        is_featured: d.is_featured ?? false,
        approval_status: status,
        approved_by_admin_id: status === "approved" ? user.id : null,
        approved_at: status === "approved" ? new Date() : null,
      },
    });
    await audit(user.id, "testimonial.create", "testimonials", String(t.id), null, serializeTestimonial(t), req);
    return ok(reply, serializeTestimonial(t), "Testimonial created.", 201);
  });

  app.put("/reviews/:id", { preHandler: [requirePermission("reviews.approve")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.testimonials.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Testimonial not found.");
    const schema = z.object({
      customer_name: z.string().min(2).max(120).optional(),
      customer_phone: z.string().max(20).optional().nullable(),
      rating: z.number().int().min(1).max(5).optional(),
      review: z.string().min(2).optional(),
      admin_reply: z.string().optional().nullable(),
      is_featured: z.boolean().optional(),
      approval_status: z.enum(["pending", "approved", "rejected"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const t = await prisma.testimonials.update({
      where: { id },
      data: {
        ...(d.customer_name != null ? { customer_name: d.customer_name } : {}),
        ...(d.customer_phone !== undefined ? { customer_phone: d.customer_phone } : {}),
        ...(d.rating != null ? { rating: d.rating } : {}),
        ...(d.review != null ? { review: d.review } : {}),
        ...(d.admin_reply !== undefined ? { admin_reply: d.admin_reply } : {}),
        ...(d.is_featured != null ? { is_featured: d.is_featured } : {}),
        ...(d.approval_status != null
          ? {
              approval_status: d.approval_status,
              approved_by_admin_id: d.approval_status === "approved" ? user.id : existing.approved_by_admin_id,
              approved_at: d.approval_status === "approved" ? new Date() : existing.approved_at,
            }
          : {}),
      },
    });
    await audit(
      user.id,
      "testimonial.update",
      "testimonials",
      String(id),
      serializeTestimonial(existing),
      serializeTestimonial(t),
      req,
    );
    return ok(reply, serializeTestimonial(t), "Testimonial updated.");
  });

  app.delete("/reviews/:id", { preHandler: [requirePermission("reviews.approve")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.testimonials.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Testimonial not found.");
    await prisma.testimonials.delete({ where: { id } });
    await audit(user.id, "testimonial.delete", "testimonials", String(id), serializeTestimonial(existing), null, req);
    return ok(reply, { id: String(id) }, "Testimonial deleted.");
  });

  app.post("/reviews/:id/approve", { preHandler: [requirePermission("reviews.approve")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const t = await prisma.testimonials.update({
      where: { id },
      data: { approval_status: "approved", approved_by_admin_id: user.id, approved_at: new Date() },
    });
    return ok(reply, serializeTestimonial(t), "Review approved.");
  });

  app.post("/reviews/:id/reject", { preHandler: [requirePermission("reviews.approve")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const t = await prisma.testimonials.update({ where: { id }, data: { approval_status: "rejected" } });
    return ok(reply, serializeTestimonial(t), "Review rejected.");
  });

  app.get("/enquiries", { preHandler: [requirePermission("support.manage")] }, async (req, reply) => {
    const q = req.query as { page?: string; per_page?: string; status?: string };
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(q.per_page ?? 20) || 20));
    const where = q.status ? { status: q.status as never } : {};
    const [total, rows] = await Promise.all([
      prisma.contactEnquiries.count({ where }),
      prisma.contactEnquiries.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(reply, rows.map(serializeEnquiry), "Enquiries fetched.", 200, {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  });

  app.get("/enquiries/:id", { preHandler: [requirePermission("support.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const e = await prisma.contactEnquiries.findUnique({ where: { id } });
    if (!e) throw new NotFoundError("Enquiry not found.");
    return ok(reply, serializeEnquiry(e));
  });

  app.put("/enquiries/:id", { preHandler: [requirePermission("support.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.contactEnquiries.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Enquiry not found.");
    const schema = z.object({
      status: z.enum(["new", "in_progress", "closed", "spam"]).optional(),
      admin_note: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const e = await prisma.contactEnquiries.update({
      where: { id },
      data: {
        ...(d.status != null ? { status: d.status } : {}),
        ...(d.admin_note !== undefined ? { admin_note: d.admin_note } : {}),
        assigned_admin_id: user.id,
      },
    });
    await audit(
      user.id,
      "enquiry.update",
      "contact_enquiries",
      String(id),
      serializeEnquiry(existing),
      serializeEnquiry(e),
      req,
    );
    return ok(reply, serializeEnquiry(e), "Enquiry updated.");
  });

  app.get("/notifications", { preHandler: [requirePermission("notifications.send")] }, async (req, reply) => {
    const q = req.query as { recipient_type?: string };
    const recipientFilter =
      q.recipient_type === "customer" || q.recipient_type === "driver" || q.recipient_type === "admin"
        ? q.recipient_type
        : undefined;
    const rows = await prisma.notificationLogs.findMany({
      where: recipientFilter ? { recipient_type: recipientFilter } : undefined,
      orderBy: { created_at: "desc" },
      take: 100,
    });
    const customerIds = [...new Set(rows.map((n) => n.customer_id).filter((id): id is bigint => id != null))];
    const driverIds = [...new Set(rows.map((n) => n.driver_id).filter((id): id is bigint => id != null))];
    const [customers, drivers] = await Promise.all([
      customerIds.length
        ? prisma.customers.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true, phone: true },
          })
        : Promise.resolve([]),
      driverIds.length
        ? prisma.drivers.findMany({
            where: { id: { in: driverIds } },
            select: { id: true, name: true, phone: true },
          })
        : Promise.resolve([]),
    ]);
    const customerMap = new Map(customers.map((c) => [String(c.id), c]));
    const driverMap = new Map(drivers.map((d) => [String(d.id), d]));
    return ok(
      reply,
      rows.map((n) => {
        const customer = n.customer_id ? customerMap.get(String(n.customer_id)) : null;
        const driver = n.driver_id ? driverMap.get(String(n.driver_id)) : null;
        const person = customer ?? driver;
        const payload = (n.data_payload ?? {}) as { audience?: string };
        const audience = payload.audience ?? null;
        const recipientName =
          person?.name ??
          (audience === "all_customers"
            ? "All customers"
            : audience === "all_drivers"
              ? "All drivers"
              : n.customer_id
                ? `Customer #${n.customer_id}`
                : n.driver_id
                  ? `Driver #${n.driver_id}`
                  : n.recipient_type === "admin"
                    ? "Admin"
                    : n.recipient_type);
        return {
          id: String(n.id),
          title: n.title,
          body: n.body,
          channel: n.channel,
          delivery_status: n.delivery_status,
          recipient_type: n.recipient_type,
          recipient_name: recipientName,
          recipient_phone: person?.phone ?? null,
          customer_id: n.customer_id ? String(n.customer_id) : null,
          driver_id: n.driver_id ? String(n.driver_id) : null,
          audience,
          sender_type: n.sender_type,
          created_at: n.created_at,
          sent_at: n.sent_at,
        };
      }),
    );
  });

  app.delete("/notifications/:id", { preHandler: [requirePermission("notifications.send")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.notificationLogs.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Notification not found.");
    await prisma.notificationLogs.delete({ where: { id } });
    return ok(reply, { id: String(id) }, "Notification deleted.");
  });

  app.post("/notifications/send", { preHandler: [requirePermission("notifications.send")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      title: z.string().trim().min(1).max(180),
      body: z.string().trim().min(1).max(2000),
      audience: z.enum(["all_customers", "all_drivers", "customer", "driver"]).optional(),
      recipient_type: z.enum(["customer", "driver", "admin"]).optional(),
      customer_id: z.union([z.string(), z.number()]).optional().nullable(),
      driver_id: z.union([z.string(), z.number()]).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());

    let audience: AdminNotificationAudience | null = parsed.data.audience ?? null;
    if (!audience && parsed.data.recipient_type && parsed.data.recipient_type !== "admin") {
      const hasCustomer = parsed.data.customer_id != null && String(parsed.data.customer_id).trim() !== "";
      const hasDriver = parsed.data.driver_id != null && String(parsed.data.driver_id).trim() !== "";
      if (parsed.data.recipient_type === "customer" && hasCustomer) audience = "customer";
      else if (parsed.data.recipient_type === "driver" && hasDriver) audience = "driver";
      else if (parsed.data.recipient_type === "customer" && !hasCustomer) audience = "all_customers";
      else if (parsed.data.recipient_type === "driver" && !hasDriver) audience = "all_drivers";
    }

    if (!audience) {
      throw new ValidationError("Choose an audience: all customers, all drivers, or a specific user.");
    }
    if (audience === "customer" && (parsed.data.customer_id == null || String(parsed.data.customer_id).trim() === "")) {
      throw new ValidationError("Select a customer to notify.");
    }
    if (audience === "driver" && (parsed.data.driver_id == null || String(parsed.data.driver_id).trim() === "")) {
      throw new ValidationError("Select a driver to notify.");
    }

    const result = await deliverAdminNotification({
      audience,
      customerId: parsed.data.customer_id != null ? String(parsed.data.customer_id) : null,
      driverId: parsed.data.driver_id != null ? String(parsed.data.driver_id) : null,
      title: parsed.data.title,
      body: parsed.data.body,
      senderAdminId: user.id,
    });

    if (result.recipient_count === 0) {
      throw new ValidationError(
        audience.startsWith("all_")
          ? `No active ${audience === "all_customers" ? "customers" : "drivers"} to notify.`
          : "Recipient not found.",
      );
    }

    const label =
      audience === "all_customers"
        ? `${result.recipient_count} customer${result.recipient_count === 1 ? "" : "s"}`
        : audience === "all_drivers"
          ? `${result.recipient_count} driver${result.recipient_count === 1 ? "" : "s"}`
          : "recipient";
    return ok(reply, result, `Notification sent to ${label}.`);
  });

  app.get("/cms", { preHandler: [requirePermission("cms.manage")] }, async (_req, reply) => {
    const rows = await prisma.cmsPages.findMany({ orderBy: { id: "desc" }, take: 100 });
    return ok(reply, rows.map((p) => ({ id: String(p.id), slug: p.slug, title: p.title, status: p.status })));
  });

  app.post("/cms", { preHandler: [requirePermission("cms.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      title: z.string(),
      slug: z.string(),
      content: z.string().optional(),
      page_type: z.enum(["static", "service", "policy", "landing"]).optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const p = await prisma.cmsPages.create({
      data: {
        ...parsed.data,
        created_by_admin_id: user.id,
        published_at: parsed.data.status === "published" ? new Date() : null,
      },
    });
    return ok(reply, { id: String(p.id) }, "CMS page created.", 201);
  });

  app.put("/cms/:id", { preHandler: [requirePermission("cms.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.cmsPages.update({
      where: { id },
      data: { ...parsed.data, updated_by_admin_id: user.id },
    });
    return ok(reply, { id: String(id) }, "CMS page updated.");
  });

  app.get("/blog", { preHandler: [requirePermission("blog.manage")] }, async (_req, reply) => {
    const rows = await prisma.blogPosts.findMany({ orderBy: { id: "desc" }, take: 100 });
    return ok(reply, rows.map((b) => ({ id: String(b.id), slug: b.slug, title: b.title, status: b.status })));
  });

  app.post("/blog", { preHandler: [requirePermission("blog.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      title: z.string(),
      slug: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const b = await prisma.blogPosts.create({
      data: {
        ...parsed.data,
        author_admin_id: user.id,
        published_at: parsed.data.status === "published" ? new Date() : null,
      },
    });
    return ok(reply, { id: String(b.id) }, "Blog post created.", 201);
  });

  app.put("/blog/:id", { preHandler: [requirePermission("blog.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.blogPosts.update({ where: { id }, data: parsed.data });
    return ok(reply, { id: String(id) }, "Blog post updated.");
  });

  app.get("/faqs", { preHandler: [requirePermission("faq.manage")] }, async (req, reply) => {
    const q = req.query as { page?: string; per_page?: string };
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(q.per_page ?? 100) || 100));
    const [total, rows] = await Promise.all([
      prisma.faqs.count(),
      prisma.faqs.findMany({
        orderBy: [{ display_order: "asc" }, { id: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(reply, rows.map(serializeFaq), "FAQs fetched.", 200, {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  });

  app.get("/faqs/:id", { preHandler: [requirePermission("faq.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const f = await prisma.faqs.findUnique({ where: { id } });
    if (!f) throw new NotFoundError("FAQ not found.");
    return ok(reply, serializeFaq(f));
  });

  app.post("/faqs", { preHandler: [requirePermission("faq.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      question: z.string().min(2).max(255),
      answer: z.string().min(2),
      category: z.string().max(100).optional().nullable(),
      related_type: z.enum(["general", "route", "service"]).optional(),
      display_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const f = await prisma.faqs.create({
      data: {
        question: parsed.data.question,
        answer: parsed.data.answer,
        category: parsed.data.category ?? null,
        related_type: parsed.data.related_type ?? "general",
        display_order: parsed.data.display_order ?? 0,
        is_active: parsed.data.is_active ?? true,
      },
    });
    await audit(user.id, "faq.create", "faqs", String(f.id), null, serializeFaq(f), req);
    return ok(reply, serializeFaq(f), "FAQ created.", 201);
  });

  app.put("/faqs/:id", { preHandler: [requirePermission("faq.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.faqs.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("FAQ not found.");
    const schema = z.object({
      question: z.string().min(2).max(255).optional(),
      answer: z.string().min(2).optional(),
      category: z.string().max(100).optional().nullable(),
      related_type: z.enum(["general", "route", "service"]).optional(),
      is_active: z.boolean().optional(),
      display_order: z.number().int().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const f = await prisma.faqs.update({
      where: { id },
      data: {
        ...(d.question != null ? { question: d.question } : {}),
        ...(d.answer != null ? { answer: d.answer } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.related_type != null ? { related_type: d.related_type } : {}),
        ...(d.is_active != null ? { is_active: d.is_active } : {}),
        ...(d.display_order != null ? { display_order: d.display_order } : {}),
      },
    });
    await audit(user.id, "faq.update", "faqs", String(id), serializeFaq(existing), serializeFaq(f), req);
    return ok(reply, serializeFaq(f), "FAQ updated.");
  });

  app.delete("/faqs/:id", { preHandler: [requirePermission("faq.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.faqs.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("FAQ not found.");
    await prisma.faqs.delete({ where: { id } });
    await audit(user.id, "faq.delete", "faqs", String(id), serializeFaq(existing), null, req);
    return ok(reply, { id: String(id) }, "FAQ deleted.");
  });

  app.get("/seo", { preHandler: [requirePermission("seo.manage")] }, async (_req, reply) => {
    const rows = await prisma.seoMeta.findMany({ take: 100 });
    return ok(reply, rows.map((s) => ({ id: String(s.id), url_path: s.url_path, meta_title: s.meta_title })));
  });

  app.put("/seo/:id", { preHandler: [requirePermission("seo.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      meta_title: z.string().optional().nullable(),
      meta_description: z.string().optional().nullable(),
      canonical_url: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.seoMeta.update({ where: { id }, data: parsed.data });
    return ok(reply, { id: String(id) }, "SEO updated.");
  });

  app.get("/support", { preHandler: [requirePermission("support.manage")] }, async (_req, reply) => {
    const rows = await prisma.supportTickets.findMany({ orderBy: { created_at: "desc" }, take: 100 });
    return ok(
      reply,
      rows.map((t) => ({
        id: String(t.id),
        ticket_reference: t.ticket_reference,
        subject: t.subject,
        status: t.status,
      })),
    );
  });

  app.get("/support/:id", { preHandler: [requirePermission("support.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const ticket = await prisma.supportTickets.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundError();
    const messages = await prisma.supportTicketMessages.findMany({
      where: { ticket_id: id },
      orderBy: { created_at: "asc" },
    });
    return ok(reply, {
      ...ticket,
      id: String(ticket.id),
      messages: messages.map((m) => ({
        id: String(m.id),
        sender_type: m.sender_type,
        message: m.message,
        created_at: m.created_at,
      })),
    });
  });

  app.post("/support/:id/messages", { preHandler: [requirePermission("support.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({ message: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const msg = await prisma.supportTicketMessages.create({
      data: {
        ticket_id: id,
        sender_type: "admin",
        admin_user_id: user.id,
        message: parsed.data.message,
      },
    });
    return ok(reply, { id: String(msg.id) }, "Message sent.", 201);
  });

  app.get("/settings", { preHandler: [requirePermission("settings.manage")] }, async (_req, reply) => {
    const rows = await prisma.appSettings.findMany();
    return ok(reply, rows.map((s) => ({ key: s.setting_key, value: s.setting_value, group: s.group_name })));
  });

  app.put("/settings/:key", { preHandler: [requirePermission("settings.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const key = (req.params as { key: string }).key;
    const schema = z.object({ value: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.appSettings.update({
      where: { setting_key: key },
      data: { setting_value: parsed.data.value },
    });
    await audit(user.id, "settings.update", "app_settings", key, null, parsed.data, req);
    return ok(reply, { key, value: parsed.data.value }, "Setting updated.");
  });

  app.get("/remote-config", { preHandler: [requirePermission("remote_config.manage")] }, async (_req, reply) => {
    const rows = await prisma.remoteConfigValues.findMany({
      orderBy: [{ app_type: "asc" }, { config_key: "asc" }],
    });
    return ok(
      reply,
      rows.map((r) => ({
        id: String(r.id),
        config_key: r.config_key,
        app_type: r.app_type,
        platform: r.platform,
        value_type: r.value_type,
        config_value: r.config_value,
        description: r.description,
        is_active: r.is_active,
        updated_at: r.updated_at,
      })),
    );
  });

  app.post("/remote-config", { preHandler: [requirePermission("remote_config.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      config_key: z.string().min(2).max(120),
      app_type: z.enum(["customer_app", "driver_app", "admin_web", "user_website", "all"]).optional(),
      platform: z.enum(["android", "ios", "web", "all"]).optional(),
      value_type: z.enum(["string", "number", "boolean", "json"]).optional(),
      config_value: z.string().optional().nullable(),
      description: z.string().max(255).optional().nullable(),
      is_active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const row = await prisma.remoteConfigValues.create({
      data: {
        config_key: parsed.data.config_key.trim(),
        app_type: parsed.data.app_type ?? "all",
        platform: parsed.data.platform ?? "all",
        value_type: parsed.data.value_type ?? "string",
        config_value: parsed.data.config_value ?? null,
        description: parsed.data.description ?? null,
        is_active: parsed.data.is_active ?? true,
      },
    });
    await audit(user.id, "remote_config.create", "remote_config_values", String(row.id), null, parsed.data, req);
    return ok(reply, { id: String(row.id) }, "Remote config created.", 201);
  });

  app.put("/remote-config/:id", { preHandler: [requirePermission("remote_config.manage")] }, async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      config_value: z.string().optional().nullable(),
      description: z.string().max(255).optional().nullable(),
      is_active: z.boolean().optional(),
      value_type: z.enum(["string", "number", "boolean", "json"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.remoteConfigValues.update({ where: { id }, data: parsed.data });
    await audit(user.id, "remote_config.update", "remote_config_values", String(id), null, parsed.data, req);
    return ok(reply, { id: String(id) }, "Remote config updated.");
  });

  app.get("/app-versions", { preHandler: [requirePermission("app_versions.manage")] }, async (_req, reply) => {
    const rows = await prisma.appVersions.findMany();
    return ok(
      reply,
      rows.map((v) => ({
        id: String(v.id),
        app_type: v.app_type,
        platform: v.platform,
        latest_version: v.latest_version,
        force_update: v.force_update,
      })),
    );
  });

  app.put("/app-versions/:id", { preHandler: [requirePermission("app_versions.manage")] }, async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      latest_version: z.string().optional(),
      minimum_supported_version: z.string().optional(),
      force_update: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.appVersions.update({ where: { id }, data: parsed.data });
    return ok(reply, { id: String(id) }, "App version updated.");
  });

  app.get("/audit-logs", { preHandler: [requirePermission("audit_logs.view")] }, async (req, reply) => {
    const page = Math.max(1, Number((req.query as { page?: string }).page ?? 1) || 1);
    const perPage = 50;
    const [total, rows] = await Promise.all([
      prisma.auditLogs.count(),
      prisma.auditLogs.findMany({
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(
      reply,
      rows.map((a) => ({
        id: String(a.id),
        action: a.action,
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        created_at: a.created_at,
      })),
      "OK",
      200,
      { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    );
  });

  app.get("/reports", { preHandler: [requirePermission("reports.view")] }, async (req, reply) => {
    const q = req.query as { period?: string };
    const period = q.period === "week" || q.period === "month" ? q.period : "day";

    const byStatus = await prisma.bookings.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const now = new Date();
    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const toYmd = (d: Date) =>
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const mondayOf = (d: Date) => {
      const x = startOfDay(d);
      const day = (x.getDay() + 6) % 7; // Mon=0
      x.setDate(x.getDate() - day);
      return x;
    };
    const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

    let from: Date;
    let bucketExpr: "day" | "week" | "month";
    const buckets: string[] = [];

    if (period === "week") {
      bucketExpr = "week";
      const thisMonday = mondayOf(now);
      from = new Date(thisMonday);
      from.setDate(from.getDate() - 7 * 11); // 12 weeks
      for (let i = 0; i < 12; i++) {
        const b = new Date(from);
        b.setDate(from.getDate() + i * 7);
        buckets.push(toYmd(b));
      }
    } else if (period === "month") {
      bucketExpr = "month";
      from = monthStart(new Date(now.getFullYear(), now.getMonth() - 11, 1));
      for (let i = 0; i < 12; i++) {
        const b = new Date(from.getFullYear(), from.getMonth() + i, 1);
        buckets.push(toYmd(b));
      }
    } else {
      bucketExpr = "day";
      from = startOfDay(now);
      from.setDate(from.getDate() - 13); // 14 days
      for (let i = 0; i < 14; i++) {
        const b = new Date(from);
        b.setDate(from.getDate() + i);
        buckets.push(toYmd(b));
      }
    }

    type AggRow = {
      bucket: string | Date;
      bookings: bigint | number;
      completed: bigint | number;
      cancelled: bigint | number;
      pending: bigint | number;
      revenue: unknown;
    };

    const rawRows =
      bucketExpr === "week"
        ? await prisma.$queryRaw<AggRow[]>`
            SELECT
              DATE_FORMAT(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), '%Y-%m-%d') AS bucket,
              COUNT(*) AS bookings,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
              COALESCE(SUM(
                CASE WHEN status = 'completed'
                  THEN COALESCE(final_total, estimated_total, 0)
                  ELSE 0 END
              ), 0) AS revenue
            FROM bookings
            WHERE created_at >= ${from}
            GROUP BY DATE_FORMAT(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), '%Y-%m-%d')
            ORDER BY bucket ASC
          `
        : bucketExpr === "month"
          ? await prisma.$queryRaw<AggRow[]>`
              SELECT
                DATE_FORMAT(created_at, '%Y-%m-01') AS bucket,
                COUNT(*) AS bookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                COALESCE(SUM(
                  CASE WHEN status = 'completed'
                    THEN COALESCE(final_total, estimated_total, 0)
                    ELSE 0 END
                ), 0) AS revenue
              FROM bookings
              WHERE created_at >= ${from}
              GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
              ORDER BY bucket ASC
            `
          : await prisma.$queryRaw<AggRow[]>`
              SELECT
                DATE_FORMAT(created_at, '%Y-%m-%d') AS bucket,
                COUNT(*) AS bookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                COALESCE(SUM(
                  CASE WHEN status = 'completed'
                    THEN COALESCE(final_total, estimated_total, 0)
                    ELSE 0 END
                ), 0) AS revenue
              FROM bookings
              WHERE created_at >= ${from}
              GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
              ORDER BY bucket ASC
            `;

    const byBucket = new Map<string, { bookings: number; completed: number; cancelled: number; pending: number; revenue: number }>();
    for (const row of rawRows) {
      const key =
        row.bucket instanceof Date ? toYmd(row.bucket) : String(row.bucket).slice(0, 10);
      byBucket.set(key, {
        bookings: Number(row.bookings ?? 0),
        completed: Number(row.completed ?? 0),
        cancelled: Number(row.cancelled ?? 0),
        pending: Number(row.pending ?? 0),
        revenue: Number(row.revenue ?? 0),
      });
    }

    const series = buckets.map((key) => {
      const hit = byBucket.get(key) ?? {
        bookings: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        revenue: 0,
      };
      let label = key;
      if (period === "day") {
        const d = new Date(`${key}T00:00:00`);
        label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      } else if (period === "week") {
        const d = new Date(`${key}T00:00:00`);
        const end = new Date(d);
        end.setDate(end.getDate() + 6);
        label = `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
      } else {
        const d = new Date(`${key}T00:00:00`);
        label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      }
      return { key, label, ...hit };
    });

    const counts = series.reduce(
      (acc, row) => {
        acc.bookings += row.bookings;
        acc.completed += row.completed;
        acc.cancelled += row.cancelled;
        acc.pending += row.pending;
        acc.revenue += row.revenue;
        return acc;
      },
      { bookings: 0, completed: 0, cancelled: 0, pending: 0, revenue: 0 },
    );
    counts.revenue = Math.round(counts.revenue * 100) / 100;

    return ok(reply, {
      period,
      from: from.toISOString(),
      to: now.toISOString(),
      counts,
      series,
      bookings_by_status: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
    });
  });
};
