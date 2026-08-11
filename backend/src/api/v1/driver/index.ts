import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../config/database.js";
import { loadEnv } from "../../../config/env.js";
import { ok } from "../../../utils/api-response.js";
import { requireAuth, requireUser } from "../../../middleware/auth.js";
import { bookingService, serializeBooking, getBookingPaymentSummary, collectBookingPayment } from "../../../services/booking.service.js";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "../../../errors/app-error.js";
import { Prisma } from "@prisma/client";

export const driverRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth("driver"));

  app.get("/profile", async (req, reply) => {
    const user = requireUser(req);
    const d = await prisma.drivers.findUnique({ where: { id: user.id } });
    if (!d) throw new NotFoundError();
    return ok(reply, {
      id: String(d.id),
      name: d.name,
      phone: d.phone,
      email: d.email,
      online_status: d.online_status,
      availability_status: d.availability_status,
      verification_status: d.verification_status,
      rating_avg: Number(d.rating_avg),
    });
  });

  app.put("/profile", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional().nullable(),
      address: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = await prisma.drivers.update({ where: { id: user.id }, data: parsed.data });
    return ok(reply, { id: String(d.id), name: d.name }, "Profile updated.");
  });

  app.get("/status", async (req, reply) => {
    const user = requireUser(req);
    const d = await prisma.drivers.findUnique({ where: { id: user.id } });
    if (!d) throw new NotFoundError();
    return ok(reply, {
      online_status: d.online_status,
      availability_status: d.availability_status,
    });
  });

  app.put("/status", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      online_status: z.enum(["offline", "online", "busy"]).optional(),
      availability_status: z.enum(["available", "on_trip", "on_leave", "suspended"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = await prisma.drivers.update({ where: { id: user.id }, data: parsed.data });
    return ok(reply, {
      online_status: d.online_status,
      availability_status: d.availability_status,
    }, "Status updated.");
  });

  app.get("/offers", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.bookingDriverOffers.findMany({
      where: { driver_id: user.id, status: { in: ["sent", "seen"] } },
      orderBy: { created_at: "desc" },
      take: 50,
    });
    return ok(
      reply,
      rows.map((o) => ({
        id: String(o.id),
        booking_id: String(o.booking_id),
        status: o.status,
        offered_fare: o.offered_fare != null ? Number(o.offered_fare) : null,
        expires_at: o.expires_at,
      })),
    );
  });

  app.get("/offers/:id", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const offer = await prisma.bookingDriverOffers.findUnique({ where: { id } });
    if (!offer || offer.driver_id !== user.id) throw new NotFoundError();
    if (offer.status === "sent") {
      await prisma.bookingDriverOffers.update({
        where: { id },
        data: { status: "seen", seen_at: new Date() },
      });
    }
    const booking = await prisma.bookings.findUnique({ where: { id: offer.booking_id } });
    return ok(reply, {
      id: String(offer.id),
      status: offer.status,
      booking: booking ? serializeBooking(booking) : null,
    });
  });

  app.post("/offers/:id/accept", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const data = await bookingService.acceptOffer(id, user.id);
    return ok(reply, data, "Offer accepted.");
  });

  app.post("/offers/:id/reject", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const offer = await prisma.bookingDriverOffers.findUnique({ where: { id } });
    if (!offer || offer.driver_id !== user.id) throw new NotFoundError();
    if (!["sent", "seen"].includes(offer.status)) throw new ConflictError("Offer not rejectable.");
    const reason = (req.body as { reason?: string } | null)?.reason ?? null;
    await prisma.bookingDriverOffers.update({
      where: { id },
      data: { status: "rejected", rejection_reason: reason, responded_at: new Date() },
    });
    return ok(reply, { id: String(id) }, "Offer rejected.");
  });

  app.get("/trips", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.bookings.findMany({
      where: { assigned_driver_id: user.id },
      orderBy: { pickup_at: "desc" },
      take: 50,
    });
    return ok(reply, rows.map(serializeBooking));
  });

  app.get("/trips/:id", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking || booking.assigned_driver_id !== user.id) throw new NotFoundError();
    const payment = await getBookingPaymentSummary(id);
    return ok(reply, {
      ...serializeBooking(booking),
      payment: {
        fare_due: payment.fare_due,
        amount_paid: payment.amount_paid,
        balance_due: payment.balance_due,
        payment_status: payment.payment_status,
      },
    });
  });

  /** How much the driver should collect from the customer. */
  app.get("/trips/:id/payment", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking || booking.assigned_driver_id !== user.id) throw new NotFoundError();
    const data = await getBookingPaymentSummary(id);
    return ok(reply, data);
  });

  /**
   * Driver records cash / UPI / etc. received from customer (full or partial).
   * Updates booking.payment_status and returns remaining balance_due.
   */
  app.post("/trips/:id/payment", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      amount: z.number().positive(),
      method: z.enum(["cash", "upi", "card", "wallet", "other"]).optional().default("cash"),
      note: z.string().max(255).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const data = await collectBookingPayment({
      bookingId: id,
      driverId: user.id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      note: parsed.data.note,
    });
    return ok(reply, data, "Payment recorded.", 201);
  });

  async function tripAction(
    req: { params: unknown; auth?: { id: bigint } },
    reply: import("fastify").FastifyReply,
    to: "on_the_way" | "arrived" | "trip_started" | "completed",
    event:
      | "driver_started_to_pickup"
      | "driver_arrived"
      | "trip_started"
      | "trip_completed",
  ) {
    const user = requireUser(req as never);
    const id = BigInt((req.params as { id: string }).id);
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking || booking.assigned_driver_id !== user.id) throw new NotFoundError();

    // Map driver "arrived" endpoint to status arrived; start on_the_way from assigned
    const data = await bookingService.transition({
      bookingId: id,
      to,
      actor: { type: "driver", driverId: user.id },
      extra: to === "completed" ? { final_total: booking.estimated_total } : undefined,
    });

    await prisma.tripEvents.create({
      data: {
        booking_id: id,
        driver_id: user.id,
        event_type: event,
        created_by_type: "driver",
      },
    });

    if (to === "completed") {
      await prisma.drivers.update({
        where: { id: user.id },
        data: {
          online_status: "online",
          availability_status: "available",
          total_completed_trips: { increment: 1 },
        },
      });
    }

    return ok(reply, data, `Trip marked ${to}.`);
  }

  app.post("/trips/:id/arrived", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking || booking.assigned_driver_id !== user.id) throw new NotFoundError();
    // allow on_the_way first if still assigned
    if (booking.status === "driver_assigned") {
      await bookingService.transition({
        bookingId: id,
        to: "on_the_way",
        actor: { type: "driver", driverId: user.id },
      });
    }
    return tripAction(req, reply, "arrived", "driver_arrived");
  });

  app.post("/trips/:id/start", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      odometer_km: z.number({ required_error: "odometer_km is required" }),
      /** Alias accepted from clients */
      start_odometer_km: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ValidationError("Start odometer reading (odometer_km) is required.", parsed.error.flatten());
    const odo = parsed.data.start_odometer_km ?? parsed.data.odometer_km;
    const data = await bookingService.startTrip(id, user.id, odo);
    return ok(reply, data, "Trip started.");
  });

  app.post("/trips/:id/complete", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      odometer_km: z.number({ required_error: "odometer_km is required" }),
      end_odometer_km: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ValidationError("End odometer reading (odometer_km) is required.", parsed.error.flatten());
    const odo = parsed.data.end_odometer_km ?? parsed.data.odometer_km;
    const data = await bookingService.closeTrip(id, user.id, odo);
    return ok(reply, data, "Trip closed.");
  });

  /** Alias: driver closes the trip after completion. */
  app.post("/trips/:id/close", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const schema = z.object({
      odometer_km: z.number({ required_error: "odometer_km is required" }),
      end_odometer_km: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ValidationError("End odometer reading (odometer_km) is required.", parsed.error.flatten());
    const odo = parsed.data.end_odometer_km ?? parsed.data.odometer_km;
    const data = await bookingService.closeTrip(id, user.id, odo);
    return ok(reply, data, "Trip closed.");
  });

  // Convenience: mark on the way
  app.post("/trips/:id/on-the-way", async (req, reply) =>
    tripAction(req, reply, "on_the_way", "driver_started_to_pickup"),
  );

  app.post("/location", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      latitude: z.number(),
      longitude: z.number(),
      heading: z.number().optional().nullable(),
      speed: z.number().optional().nullable(),
      accuracy: z.number().optional().nullable(),
      battery: z.number().int().min(0).max(100).optional().nullable(),
      recorded_at: z.string().optional(),
      booking_id: z.union([z.string(), z.number()]).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const recordedAt = d.recorded_at ? new Date(d.recorded_at) : new Date();

    await prisma.$transaction([
      prisma.driverLocations.create({
        data: {
          driver_id: user.id,
          booking_id: d.booking_id != null ? BigInt(d.booking_id) : null,
          latitude: d.latitude,
          longitude: d.longitude,
          heading: d.heading != null ? new Prisma.Decimal(d.heading) : null,
          speed_kmph: d.speed != null ? new Prisma.Decimal(d.speed) : null,
          accuracy_meters: d.accuracy != null ? new Prisma.Decimal(d.accuracy) : null,
          battery_percentage: d.battery ?? null,
          recorded_at: recordedAt,
        },
      }),
      prisma.drivers.update({
        where: { id: user.id },
        data: {
          current_latitude: d.latitude,
          current_longitude: d.longitude,
          last_location_at: recordedAt,
        },
      }),
    ]);

    return ok(reply, { recorded_at: recordedAt.toISOString() }, "Location updated.");
  });

  app.get("/documents", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.driverDocuments.findMany({ where: { driver_id: user.id } });
    return ok(
      reply,
      rows.map((d) => ({
        id: String(d.id),
        document_type: d.document_type,
        verification_status: d.verification_status,
        expiry_date: d.expiry_date,
        file_url: d.file_url,
      })),
    );
  });

  /** Multipart image/PDF upload → public URL for document registration. */
  app.post("/uploads", async (req, reply) => {
    const user = requireUser(req);
    const env = loadEnv();
    const file = await req.file();
    if (!file) throw new ValidationError("File is required.");

    const mime = file.mimetype || "";
    const allowedMime = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ]);
    if (!allowedMime.has(mime) && !mime.startsWith("image/")) {
      throw new ValidationError("Only images (JPG/PNG/WebP) or PDF files are allowed.");
    }

    const extFromName = path.extname(file.filename || "").toLowerCase();
    const ext =
      extFromName && [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"].includes(extFromName)
        ? extFromName
        : mime === "application/pdf"
          ? ".pdf"
          : mime === "image/png"
            ? ".png"
            : mime === "image/webp"
              ? ".webp"
              : mime === "image/gif"
                ? ".gif"
                : ".jpg";

    const filename = `${user.id}-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const dir = path.resolve(env.STORAGE_PATH, "public", "documents");
    fs.mkdirSync(dir, { recursive: true });
    const fullPath = path.join(dir, filename);
    await fs.promises.writeFile(fullPath, await file.toBuffer());

    const relativeUrl = `/storage/public/documents/${filename}`;
    const absoluteUrl = `${env.APP_URL.replace(/\/$/, "")}${relativeUrl}`;
    return ok(reply, { url: absoluteUrl, path: relativeUrl }, "File uploaded.", 201);
  });

  app.post("/documents", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      document_type: z.enum([
        "license",
        "aadhaar",
        "pan",
        "rc",
        "insurance",
        "permit",
        "pollution",
        "fitness",
        "profile_photo",
        "other",
      ]),
      file_url: z.string().min(1),
      document_no: z.string().optional().nullable(),
      expiry_date: z.string().optional().nullable(),
      vehicle_id: z.union([z.string(), z.number()]).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const row = await prisma.driverDocuments.create({
      data: {
        driver_id: user.id,
        document_type: parsed.data.document_type,
        file_url: parsed.data.file_url,
        document_no: parsed.data.document_no ?? null,
        expiry_date: parsed.data.expiry_date ? new Date(parsed.data.expiry_date) : null,
        vehicle_id: parsed.data.vehicle_id != null ? BigInt(parsed.data.vehicle_id) : null,
      },
    });
    return ok(reply, { id: String(row.id) }, "Document uploaded.", 201);
  });

  app.get("/wallet", async (req, reply) => {
    const user = requireUser(req);
    const txns = await prisma.driverWalletTransactions.findMany({
      where: { driver_id: user.id },
      orderBy: { created_at: "desc" },
      take: 1,
    });
    const latest = txns[0];
    let balance = 0;
    if (latest?.balance_after != null) balance = Number(latest.balance_after);
    else {
      const all = await prisma.driverWalletTransactions.findMany({ where: { driver_id: user.id } });
      for (const t of all) {
        balance += t.transaction_type === "credit" ? Number(t.amount) : -Number(t.amount);
      }
    }
    return ok(reply, { balance });
  });

  app.get("/wallet/transactions", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.driverWalletTransactions.findMany({
      where: { driver_id: user.id },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    return ok(
      reply,
      rows.map((t) => ({
        id: String(t.id),
        transaction_type: t.transaction_type,
        source_type: t.source_type,
        amount: Number(t.amount),
        balance_after: t.balance_after != null ? Number(t.balance_after) : null,
        created_at: t.created_at,
      })),
    );
  });

  app.get("/payouts", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.driverPayouts.findMany({
      where: { driver_id: user.id },
      orderBy: { created_at: "desc" },
    });
    return ok(
      reply,
      rows.map((p) => ({
        id: String(p.id),
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        created_at: p.created_at,
      })),
    );
  });

  app.post("/payouts", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      amount: z.number().positive(),
      method: z.enum(["cash", "upi", "bank_transfer", "other"]).default("upi"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const row = await prisma.driverPayouts.create({
      data: {
        driver_id: user.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        status: "pending",
        requested_at: new Date(),
        payout_reference: `PO${Date.now()}`,
      },
    });
    return ok(reply, { id: String(row.id) }, "Payout requested.", 201);
  });

  app.get("/notifications", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.notificationLogs.findMany({
      where: { driver_id: user.id },
      orderBy: { created_at: "desc" },
      take: 50,
    });
    return ok(
      reply,
      rows.map((n) => ({
        id: String(n.id),
        title: n.title,
        body: n.body,
        created_at: n.created_at,
      })),
    );
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
        user_type: "driver",
        driver_id: user.id,
        platform: parsed.data.platform,
        fcm_token: parsed.data.fcm_token,
        device_uuid: parsed.data.device_uuid,
        app_version: parsed.data.app_version,
        last_seen_at: new Date(),
      },
      update: {
        driver_id: user.id,
        user_type: "driver",
        is_active: true,
        last_seen_at: new Date(),
      },
    });
    return ok(reply, { id: String(row.id) }, "Device registered.", 201);
  });

  void ForbiddenError;
};
