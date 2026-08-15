import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../../config/database.js";
import { ok } from "../../../utils/api-response.js";
import { ValidationError, NotFoundError } from "../../../errors/app-error.js";
import { bookingService } from "../../../services/booking.service.js";
import { notifyAdmins } from "../../../services/fcm.service.js";
import { getPublicFeedback, submitPublicFeedback } from "../../../services/feedback.service.js";
import { loadDriverPhotoBytes } from "../../../services/driver-photo.service.js";
import { loadAdminPhotoBytes } from "../../../services/admin-photo.service.js";
import { loadPublicInvoicePdf } from "../../../services/invoice.service.js";
import { mapService } from "../../../services/map.service.js";
import { absolutePublicUrl } from "../../../utils/public-url.js";
import type { TripType } from "@prisma/client";

function paginate(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20) || 20));
  return { page, perPage, skip: (page - 1) * perPage };
}

export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/drivers/:id/photo", async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const photo = await loadDriverPhotoBytes(id);
    if (!photo) throw new NotFoundError("Driver photo not found.");
    return reply
      .header("Cache-Control", "public, max-age=60")
      .header("Content-Type", photo.mimeType)
      .header("Content-Length", String(photo.bytes.length))
      .send(photo.bytes);
  });

  app.get("/admins/:id/photo", async (req, reply) => {
    const id = BigInt((req.params as { id: string }).id);
    const admin = await prisma.adminUsers.findUnique({
      where: { id },
      select: { avatar_url: true },
    });
    if (!admin) throw new NotFoundError("Admin photo not found.");
    const photo = await loadAdminPhotoBytes(id, admin.avatar_url);
    if (!photo) throw new NotFoundError("Admin photo not found.");
    return reply
      .header("Cache-Control", "public, max-age=60")
      .header("Content-Type", photo.mimeType)
      .header("Content-Length", String(photo.bytes.length))
      .send(photo.bytes);
  });

  app.get("/invoices/*", async (req, reply) => {
    const invoiceNumber = String((req.params as { "*": string })["*"] ?? "");
    const { invoice, pdfBuffer } = await loadPublicInvoicePdf(invoiceNumber);
    return reply
      .header("Cache-Control", "private, max-age=120")
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `inline; filename="${invoice.invoice_number}.pdf"`)
      .header("Content-Length", String(pdfBuffer.length))
      .send(pdfBuffer);
  });

  app.get("/cities", async (req, reply) => {
    const { page, perPage, skip } = paginate(req.query as Record<string, unknown>);
    const where = { is_active: true };
    const [total, rows] = await Promise.all([
      prisma.cities.count({ where }),
      prisma.cities.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: perPage,
      }),
    ]);
    return ok(
      reply,
      rows.map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        state: c.state,
        is_airport: c.is_airport,
      })),
      "Cities fetched.",
      200,
      { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    );
  });

  app.get("/routes", async (req, reply) => {
    const q = req.query as Record<string, unknown>;
    const { page, perPage, skip } = paginate(q);
    const popularOnly = String(q.popular ?? "") === "1" || String(q.popular ?? "") === "true";
    const where = {
      is_active: true,
      ...(popularOnly ? { is_popular: true } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.routes.count({ where }),
      prisma.routes.findMany({
        where,
        orderBy: [{ is_popular: "desc" }, { title: "asc" }],
        skip,
        take: perPage,
      }),
    ]);

    const cityIds = [...new Set(rows.flatMap((r) => [r.pickup_city_id, r.drop_city_id]))];
    const cities = cityIds.length
      ? await prisma.cities.findMany({ where: { id: { in: cityIds } } })
      : [];
    const cityMap = new Map(cities.map((c) => [String(c.id), c]));

    const routeIds = rows.map((r) => r.id);
    const tariffs = routeIds.length
      ? await prisma.tariffPlans.findMany({
          where: {
            route_id: { in: routeIds },
            trip_type: "one_way",
            is_active: true,
          },
          orderBy: { id: "asc" },
        })
      : [];
    const tariffByRoute = new Map<string, (typeof tariffs)[number]>();
    for (const t of tariffs) {
      if (t.route_id == null) continue;
      const key = String(t.route_id);
      if (!tariffByRoute.has(key)) tariffByRoute.set(key, t);
    }

    // Fallback generic sedan-style rate for routes without a fixed tariff
    const generic = await prisma.tariffPlans.findFirst({
      where: { trip_type: "one_way", route_id: null, is_active: true },
      orderBy: { rate_per_km: "asc" },
    });

    return ok(
      reply,
      rows.map((r) => {
        const from = cityMap.get(String(r.pickup_city_id))?.name ?? null;
        const to = cityMap.get(String(r.drop_city_id))?.name ?? null;
        const tariff = tariffByRoute.get(String(r.id));
        let startingFare: number | null = null;
        if (r.amount != null) {
          startingFare = Math.round(Number(r.amount));
        } else if (tariff) {
          const base = Number(tariff.base_fare);
          const min = Number(tariff.minimum_fare);
          const rate = Number(tariff.rate_per_km);
          const batta = Number(tariff.driver_batta);
          const dist = Number(r.distance_km);
          startingFare = Math.max(min, base + rate * dist + batta);
        } else if (generic) {
          startingFare =
            Number(generic.base_fare) +
            Number(generic.rate_per_km) * Number(r.distance_km) +
            Number(generic.driver_batta);
        }
        if (startingFare != null) startingFare = Math.round(startingFare);

        return {
          id: String(r.id),
          slug: r.slug,
          title: r.title,
          from,
          to,
          distance_km: Number(r.distance_km),
          duration_minutes: r.duration_minutes,
          is_popular: r.is_popular,
          amount: r.amount != null ? Number(r.amount) : null,
          starting_fare: startingFare,
          image_url: r.image_url ? absolutePublicUrl(r.image_url, req) : null,
          tag: r.content?.trim() || (r.is_popular ? "Popular" : null),
        };
      }),
      "Routes fetched.",
      200,
      { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    );
  });

  app.get("/routes/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const route = await prisma.routes.findFirst({ where: { slug, is_active: true } });
    if (!route) throw new NotFoundError("Route not found.");
    return ok(reply, {
      id: String(route.id),
      slug: route.slug,
      title: route.title,
      distance_km: Number(route.distance_km),
      duration_minutes: route.duration_minutes,
      content: route.content,
      faq_content: route.faq_content,
      image_url: route.image_url ? absolutePublicUrl(route.image_url, req) : null,
      amount: route.amount != null ? Number(route.amount) : null,
      starting_fare: route.amount != null ? Math.round(Number(route.amount)) : null,
    });
  });

  app.get("/vehicle-categories", async (req, reply) => {
    const rows = await prisma.vehicleCategories.findMany({
      where: { is_active: true },
      orderBy: { display_order: "asc" },
    });
    return ok(
      reply,
      rows.map((v) => ({
        id: String(v.id),
        name: v.name,
        slug: v.slug,
        seating_capacity: v.seating_capacity,
        luggage_capacity: v.luggage_capacity,
        description: v.description,
        image_url: v.image_url ? absolutePublicUrl(v.image_url, req) : null,
        one_way_rate_per_km: Number(v.one_way_rate_per_km),
        round_trip_rate_per_km: Number(v.round_trip_rate_per_km),
        driver_batta: Number(v.driver_batta),
      })),
    );
  });

  app.get("/tariffs", async (_req, reply) => {
    const rows = await prisma.tariffPlans.findMany({
      where: { is_active: true },
      orderBy: { id: "asc" },
      take: 100,
    });
    return ok(
      reply,
      rows.map((t) => ({
        id: String(t.id),
        vehicle_category_id: String(t.vehicle_category_id),
        trip_type: t.trip_type,
        route_id: t.route_id != null ? String(t.route_id) : null,
        rate_per_km: Number(t.rate_per_km),
        base_fare: Number(t.base_fare),
        driver_batta: Number(t.driver_batta),
        minimum_fare: Number(t.minimum_fare),
        gst_percentage: Number(t.gst_percentage),
      })),
    );
  });

  app.get("/faqs", async (_req, reply) => {
    const rows = await prisma.faqs.findMany({
      where: { is_active: true },
      orderBy: { display_order: "asc" },
    });
    return ok(
      reply,
      rows.map((f) => ({
        id: String(f.id),
        question: f.question,
        answer: f.answer,
        related_type: f.related_type,
      })),
    );
  });

  app.get("/cms/pages/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const page = await prisma.cmsPages.findFirst({
      where: { slug, status: "published" },
    });
    if (!page) throw new NotFoundError("Page not found.");
    return ok(reply, {
      id: String(page.id),
      slug: page.slug,
      title: page.title,
      content: page.content,
      page_type: page.page_type,
    });
  });

  app.get("/blog", async (req, reply) => {
    const { page, perPage, skip } = paginate(req.query as Record<string, unknown>);
    const where = { status: "published" as const };
    const [total, rows] = await Promise.all([
      prisma.blogPosts.count({ where }),
      prisma.blogPosts.findMany({
        where,
        orderBy: { published_at: "desc" },
        skip,
        take: perPage,
      }),
    ]);
    return ok(
      reply,
      rows.map((b) => ({
        id: String(b.id),
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt,
        published_at: b.published_at,
      })),
      "Blog posts fetched.",
      200,
      { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    );
  });

  app.get("/blog/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const post = await prisma.blogPosts.findFirst({ where: { slug, status: "published" } });
    if (!post) throw new NotFoundError("Post not found.");
    return ok(reply, {
      id: String(post.id),
      slug: post.slug,
      title: post.title,
      content: post.content,
      published_at: post.published_at,
    });
  });

  app.get("/testimonials", async (_req, reply) => {
    const rows = await prisma.testimonials.findMany({
      where: { approval_status: "approved" },
      orderBy: { created_at: "desc" },
      take: 50,
    });
    return ok(
      reply,
      rows.map((t) => ({
        id: String(t.id),
        customer_name: t.customer_name,
        rating: t.rating,
        review: t.review,
        is_featured: t.is_featured,
      })),
    );
  });

  app.get("/app-config", async (req, reply) => {
    const q = req.query as { app?: string; platform?: string };
    const appType = q.app?.trim() || "all";
    const platform = q.platform?.trim() || "all";

    const [settings, remote] = await Promise.all([
      prisma.appSettings.findMany({ where: { is_public: true } }),
      prisma.remoteConfigValues.findMany({ where: { is_active: true } }),
    ]);

    const scored = new Map<string, { value: string | null; score: number }>();
    for (const row of remote) {
      let score = 0;
      if (row.app_type === appType) score += 2;
      else if (row.app_type === "all") score += 1;
      else continue;
      if (row.platform === platform) score += 2;
      else if (row.platform === "all") score += 1;
      else continue;
      const prev = scored.get(row.config_key);
      if (!prev || score >= prev.score) {
        scored.set(row.config_key, { value: row.config_value, score });
      }
    }

    return ok(reply, {
      settings: Object.fromEntries(settings.map((s) => [s.setting_key, s.setting_value])),
      remote_config: Object.fromEntries([...scored.entries()].map(([k, v]) => [k, v.value])),
    });
  });

  app.post("/contact", async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      phone: z.string().min(8),
      email: z.string().email().optional(),
      subject: z.string().optional(),
      message: z.string().min(5),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const row = await prisma.contactEnquiries.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        subject: parsed.data.subject ?? null,
        message: parsed.data.message,
      },
    });
    await notifyAdmins({
      jobType: "notify_enquiry_created",
      title: "New enquiry",
      body: `${row.name} (${row.phone})${row.subject ? ` · ${row.subject}` : ""}`,
      extra: { type: "enquiry", enquiry_id: String(row.id) },
    });
    return ok(reply, { id: String(row.id) }, "Enquiry submitted.", 201);
  });

  app.get("/route/estimate", async (req, reply) => {
    const schema = z.object({
      pickup: z.object({ latitude: z.number(), longitude: z.number() }),
      drop: z.object({ latitude: z.number(), longitude: z.number() }),
    });
    // support both query JSON and body via query params nested is awkward; accept body-like query or POST-style
    const q = req.query as Record<string, string>;
    const body =
      req.method === "GET" && q.pickup_lat
        ? {
            pickup: { latitude: Number(q.pickup_lat), longitude: Number(q.pickup_lng) },
            drop: { latitude: Number(q.drop_lat), longitude: Number(q.drop_lng) },
          }
        : req.body;
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ValidationError("pickup and drop coordinates required.", parsed.error.flatten());
    const data = await mapService.estimateRoute(parsed.data.pickup, parsed.data.drop);
    return ok(reply, data, "Route estimated.");
  });

  app.post("/route/estimate", async (req, reply) => {
    const schema = z.object({
      pickup: z.object({ latitude: z.number(), longitude: z.number() }),
      drop: z.object({ latitude: z.number(), longitude: z.number() }),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const data = await mapService.estimateRoute(parsed.data.pickup, parsed.data.drop);
    return ok(reply, data, "Route estimated.");
  });

  app.post("/fare/estimate", async (req, reply) => {
    const schema = z.object({
      vehicle_category_id: z.union([z.string(), z.number()]),
      trip_type: z.enum(["one_way", "round_trip", "airport", "outstation", "local_rental"]),
      route_id: z.union([z.string(), z.number()]).optional().nullable(),
      pickup_location: z.string().optional().nullable(),
      drop_location: z.string().optional().nullable(),
      pickup_latitude: z.number().optional().nullable(),
      pickup_longitude: z.number().optional().nullable(),
      drop_latitude: z.number().optional().nullable(),
      drop_longitude: z.number().optional().nullable(),
      distance_km: z.number().positive().optional().nullable(),
      coupon_code: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const data = await bookingService.quote({
      vehicleCategoryId: BigInt(d.vehicle_category_id),
      tripType: d.trip_type as TripType,
      routeId: d.route_id != null ? BigInt(d.route_id) : null,
      pickupLatitude: d.pickup_latitude,
      pickupLongitude: d.pickup_longitude,
      dropLatitude: d.drop_latitude,
      dropLongitude: d.drop_longitude,
      distanceKm: d.distance_km,
      couponCode: d.coupon_code,
    });
    return ok(reply, data, "Fare estimated.");
  });

  app.post("/bookings/track", async (req, reply) => {
    const schema = z.object({
      booking_reference: z.string().min(3),
      customer_phone: z.string().min(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const data = await bookingService.trackPublic(
      parsed.data.booking_reference,
      parsed.data.customer_phone,
    );
    return ok(reply, data, "Booking status fetched.");
  });

  app.post("/bookings", async (req, reply) => {
    const schema = z.object({
      vehicle_category_id: z.union([z.string(), z.number()]),
      route_id: z.union([z.string(), z.number()]).optional().nullable(),
      trip_type: z.enum(["one_way", "round_trip", "airport", "outstation", "local_rental"]),
      customer_name: z.string().min(2),
      customer_phone: z.string().min(8),
      customer_email: z.string().email().optional().nullable(),
      pickup_location: z.string().min(2),
      drop_location: z.string().min(2),
      pickup_city: z.string().optional().nullable(),
      drop_city: z.string().optional().nullable(),
      pickup_latitude: z.number().optional().nullable(),
      pickup_longitude: z.number().optional().nullable(),
      drop_latitude: z.number().optional().nullable(),
      drop_longitude: z.number().optional().nullable(),
      pickup_at: z.string(),
      return_at: z.string().optional().nullable(),
      passenger_count: z.number().int().optional().nullable(),
      luggage_note: z.string().optional().nullable(),
      special_note: z.string().optional().nullable(),
      coupon_code: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const d = parsed.data;
    const data = await bookingService.create({
      vehicleCategoryId: BigInt(d.vehicle_category_id),
      routeId: d.route_id != null ? BigInt(d.route_id) : null,
      tripType: d.trip_type as TripType,
      bookingSource: "website",
      customerName: d.customer_name,
      customerPhone: d.customer_phone,
      customerEmail: d.customer_email,
      pickupLocation: d.pickup_location,
      dropLocation: d.drop_location,
      pickupCity: d.pickup_city,
      dropCity: d.drop_city,
      pickupLatitude: d.pickup_latitude,
      pickupLongitude: d.pickup_longitude,
      dropLatitude: d.drop_latitude,
      dropLongitude: d.drop_longitude,
      pickupAt: new Date(d.pickup_at),
      returnAt: d.return_at ? new Date(d.return_at) : null,
      passengerCount: d.passenger_count,
      luggageNote: d.luggage_note,
      specialNote: d.special_note,
      couponCode: d.coupon_code,
    });
    return ok(reply, data, "Booking created successfully.", 201);
  });

  app.get("/feedback/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const data = await getPublicFeedback(token);
    return ok(reply, data, "Feedback form loaded.");
  });

  app.post("/feedback/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      review: z.string().max(800).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const data = await submitPublicFeedback(token, parsed.data);
    return ok(reply, data, "Thank you for your feedback.", 201);
  });
};
