import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../../config/database.js";
import { ok } from "../../../utils/api-response.js";
import { requireAuth, requireUser } from "../../../middleware/auth.js";
import { bookingService, serializeBooking } from "../../../services/booking.service.js";
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "../../../errors/app-error.js";
import type { TripType } from "@prisma/client";

export const customerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth("customer"));

  app.get("/profile", async (req, reply) => {
    const user = requireUser(req);
    const c = await prisma.customers.findUnique({ where: { id: user.id } });
    if (!c) throw new NotFoundError();
    return ok(reply, {
      id: String(c.id),
      name: c.name,
      phone: c.phone,
      email: c.email,
      city: c.city,
      preferred_language: c.preferred_language,
    });
  });

  app.put("/profile", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional().nullable(),
      city: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      preferred_language: z.enum(["en", "ta"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const c = await prisma.customers.update({ where: { id: user.id }, data: parsed.data });
    return ok(reply, { id: String(c.id), name: c.name, phone: c.phone, email: c.email }, "Profile updated.");
  });

  app.get("/saved-places", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.customerSavedPlaces.findMany({ where: { customer_id: user.id } });
    return ok(
      reply,
      rows.map((r) => ({
        id: String(r.id),
        label: r.label,
        title: r.title,
        address: r.address,
        latitude: r.latitude != null ? Number(r.latitude) : null,
        longitude: r.longitude != null ? Number(r.longitude) : null,
      })),
    );
  });

  app.post("/saved-places", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      label: z.enum(["home", "work", "other"]).default("other"),
      title: z.string().min(1),
      address: z.string().min(1),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const row = await prisma.customerSavedPlaces.create({
      data: {
        customer_id: user.id,
        label: parsed.data.label,
        title: parsed.data.title,
        address: parsed.data.address,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
      },
    });
    return ok(reply, { id: String(row.id) }, "Saved place created.", 201);
  });

  app.put("/saved-places/:id", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.customerSavedPlaces.findUnique({ where: { id } });
    if (!existing || existing.customer_id !== user.id) throw new NotFoundError();
    const schema = z.object({
      label: z.enum(["home", "work", "other"]).optional(),
      title: z.string().min(1).optional(),
      address: z.string().min(1).optional(),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    await prisma.customerSavedPlaces.update({ where: { id }, data: parsed.data });
    return ok(reply, { id: String(id) }, "Saved place updated.");
  });

  app.delete("/saved-places/:id", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const existing = await prisma.customerSavedPlaces.findUnique({ where: { id } });
    if (!existing || existing.customer_id !== user.id) throw new NotFoundError();
    await prisma.customerSavedPlaces.delete({ where: { id } });
    return ok(reply, { id: String(id) }, "Saved place deleted.");
  });

  app.get("/bookings", async (req, reply) => {
    const user = requireUser(req);
    const page = Math.max(1, Number((req.query as { page?: string }).page ?? 1) || 1);
    const perPage = Math.min(50, Math.max(1, Number((req.query as { per_page?: string }).per_page ?? 20) || 20));
    const where = { customer_id: user.id };
    const [total, rows] = await Promise.all([
      prisma.bookings.count({ where }),
      prisma.bookings.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return ok(reply, rows.map(serializeBooking), "Bookings fetched.", 200, {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  });

  app.get("/bookings/:id", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const data = await bookingService.getCustomerDetail(id, user.id);
    return ok(reply, data);
  });

  app.post("/bookings", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      vehicle_category_id: z.union([z.string(), z.number()]),
      route_id: z.union([z.string(), z.number()]).optional().nullable(),
      trip_type: z.enum(["one_way", "round_trip", "airport", "outstation", "local_rental"]),
      customer_name: z.string().min(2).optional(),
      customer_phone: z.string().min(8).optional(),
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
      coupon_code: z.string().optional().nullable(),
      special_note: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const profile = await prisma.customers.findUnique({ where: { id: user.id } });
    if (!profile) throw new NotFoundError();
    const active = await prisma.bookings.findFirst({
      where: {
        customer_id: user.id,
        status: {
          in: [
            "pending",
            "confirmed",
            "driver_notified",
            "driver_accepted",
            "driver_assigned",
            "on_the_way",
            "arrived",
            "trip_started",
          ],
        },
      },
      select: { id: true, booking_reference: true },
    });
    if (active) {
      throw new ConflictError(
        `You already have an ongoing booking (${active.booking_reference}). Finish or cancel it before booking again.`,
      );
    }
    const d = parsed.data;
    const data = await bookingService.create({
      customerId: user.id,
      vehicleCategoryId: BigInt(d.vehicle_category_id),
      routeId: d.route_id != null ? BigInt(d.route_id) : null,
      tripType: d.trip_type as TripType,
      bookingSource: "customer_app",
      customerName: d.customer_name ?? profile.name,
      customerPhone: d.customer_phone ?? profile.phone,
      customerEmail: d.customer_email ?? profile.email,
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
      couponCode: d.coupon_code,
      specialNote: d.special_note,
    });
    return ok(reply, data, "Booking created successfully.", 201);
  });

  app.post("/bookings/:id/cancel", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const reason = (req.body as { reason?: string } | null)?.reason;
    const data = await bookingService.cancel(id, { type: "customer", customerId: user.id }, reason);
    return ok(reply, data, "Booking cancelled.");
  });

  app.get("/bookings/:id/invoice", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking || booking.customer_id !== user.id) throw new NotFoundError();
    const invoice = await prisma.bookingInvoices.findUnique({ where: { booking_id: id } });
    if (!invoice) throw new NotFoundError("Invoice not found.");
    return ok(reply, {
      id: String(invoice.id),
      invoice_number: invoice.invoice_number,
      total_amount: Number(invoice.total_amount),
      status: invoice.status,
      invoice_date: invoice.invoice_date,
    });
  });

  app.get("/bookings/:id/location", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking || booking.customer_id !== user.id) throw new NotFoundError();
    if (!booking.assigned_driver_id) return ok(reply, null, "No driver assigned yet.");
    const loc = await prisma.driverLocations.findFirst({
      where: { driver_id: booking.assigned_driver_id, booking_id: id },
      orderBy: { recorded_at: "desc" },
    });
    if (!loc) {
      const driver = await prisma.drivers.findUnique({ where: { id: booking.assigned_driver_id } });
      return ok(reply, {
        latitude: driver?.current_latitude != null ? Number(driver.current_latitude) : null,
        longitude: driver?.current_longitude != null ? Number(driver.current_longitude) : null,
        recorded_at: driver?.last_location_at,
      });
    }
    return ok(reply, {
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      heading: loc.heading != null ? Number(loc.heading) : null,
      speed_kmph: loc.speed_kmph != null ? Number(loc.speed_kmph) : null,
      recorded_at: loc.recorded_at,
    });
  });

  app.post("/bookings/:id/rating", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking || booking.customer_id !== user.id) throw new NotFoundError();
    if (booking.status !== "completed") throw new ForbiddenError("Trip not completed.");
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      review: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const row = await prisma.tripRatings.upsert({
      where: { booking_id: id },
      create: {
        booking_id: id,
        customer_id: user.id,
        driver_id: booking.assigned_driver_id,
        customer_rating: parsed.data.rating,
        customer_review: parsed.data.review ?? null,
      },
      update: {
        customer_rating: parsed.data.rating,
        customer_review: parsed.data.review ?? null,
      },
    });
    return ok(reply, { id: String(row.id) }, "Rating submitted.", 201);
  });

  app.get("/notifications", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.notificationLogs.findMany({
      where: { customer_id: user.id },
      orderBy: { created_at: "desc" },
      take: 50,
    });
    return ok(
      reply,
      rows.map((n) => ({
        id: String(n.id),
        title: n.title,
        body: n.body,
        channel: n.channel,
        delivery_status: n.delivery_status,
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
        user_type: "customer",
        customer_id: user.id,
        platform: parsed.data.platform,
        fcm_token: parsed.data.fcm_token,
        device_uuid: parsed.data.device_uuid,
        app_version: parsed.data.app_version,
        last_seen_at: new Date(),
      },
      update: {
        customer_id: user.id,
        user_type: "customer",
        is_active: true,
        last_seen_at: new Date(),
        app_version: parsed.data.app_version,
      },
    });
    return ok(reply, { id: String(row.id) }, "Device registered.", 201);
  });

  app.delete("/devices/:id", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const device = await prisma.appDevices.findUnique({ where: { id } });
    if (!device || device.customer_id !== user.id) throw new NotFoundError();
    await prisma.appDevices.update({ where: { id }, data: { is_active: false } });
    return ok(reply, { id: String(id) }, "Device removed.");
  });

  app.get("/support", async (req, reply) => {
    const user = requireUser(req);
    const rows = await prisma.supportTickets.findMany({
      where: { customer_id: user.id },
      orderBy: { created_at: "desc" },
    });
    return ok(
      reply,
      rows.map((t) => ({
        id: String(t.id),
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
      })),
    );
  });

  app.post("/support", async (req, reply) => {
    const user = requireUser(req);
    const schema = z.object({
      subject: z.string().min(3),
      message: z.string().min(5),
      booking_id: z.union([z.string(), z.number()]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const ticket = await prisma.$transaction(async (tx) => {
      const ref = `TKT${Date.now().toString().slice(-10)}`;
      const t = await tx.supportTickets.create({
        data: {
          ticket_reference: ref,
          subject: parsed.data.subject,
          raised_by_type: "customer",
          customer_id: user.id,
          booking_id: parsed.data.booking_id != null ? BigInt(parsed.data.booking_id) : null,
          priority: parsed.data.priority ?? "medium",
        },
      });
      await tx.supportTicketMessages.create({
        data: {
          ticket_id: t.id,
          sender_type: "customer",
          customer_id: user.id,
          message: parsed.data.message,
        },
      });
      return t;
    });
    return ok(reply, { id: String(ticket.id), ticket_reference: ticket.ticket_reference }, "Support ticket created.", 201);
  });

  app.get("/support/:id", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const ticket = await prisma.supportTickets.findUnique({ where: { id } });
    if (!ticket || ticket.customer_id !== user.id) throw new NotFoundError();
    const messages = await prisma.supportTicketMessages.findMany({
      where: { ticket_id: id },
      orderBy: { created_at: "asc" },
    });
    return ok(reply, {
      id: String(ticket.id),
      subject: ticket.subject,
      status: ticket.status,
      messages: messages.map((m) => ({
        id: String(m.id),
        sender_type: m.sender_type,
        message: m.message,
        created_at: m.created_at,
      })),
    });
  });

  app.post("/support/:id/messages", async (req, reply) => {
    const user = requireUser(req);
    const id = BigInt((req.params as { id: string }).id);
    const ticket = await prisma.supportTickets.findUnique({ where: { id } });
    if (!ticket || ticket.customer_id !== user.id) throw new NotFoundError();
    const schema = z.object({ message: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed.", parsed.error.flatten());
    const msg = await prisma.supportTicketMessages.create({
      data: {
        ticket_id: id,
        sender_type: "customer",
        customer_id: user.id,
        message: parsed.data.message,
      },
    });
    return ok(reply, { id: String(msg.id) }, "Message sent.", 201);
  });
};
