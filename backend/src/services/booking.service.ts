import type { BookingStatus, ChangedByType, TripType, BookingSource, Coupons, TariffPlans } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { calculateFare, type FareBreakdown } from "../domain/fare.js";
import { assertTransition, canCancel } from "../domain/booking-state-machine.js";
import { bookingReference } from "../utils/crypto.js";
import { normalizePhone, phoneLookupVariants } from "../utils/phone.js";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../errors/app-error.js";
import { deliverBookingNotification, notifyAdmins } from "./fcm.service.js";
import { driverPhotoPublicPath, publicMediaPath } from "./driver-photo.service.js";
import { mapService } from "./map.service.js";

export { normalizePhone };

function dec(n: number) {
  return new Prisma.Decimal(n);
}

async function alertAdmins(params: {
  title: string;
  body: string;
  jobType: string;
  booking: {
    id: bigint;
    customer_id?: bigint | null;
    assigned_driver_id?: bigint | null;
  };
}) {
  await notifyAdmins({
    title: params.title,
    body: params.body,
    jobType: params.jobType,
    bookingId: String(params.booking.id),
    customerId: params.booking.customer_id ? String(params.booking.customer_id) : null,
    driverId: params.booking.assigned_driver_id ? String(params.booking.assigned_driver_id) : null,
    extra: { type: "booking" },
  });
}

/**
 * Website / guest bookings: one customer per mobile (unique).
 * First booking creates a record with no password. Later bookings update name + email.
 */
async function upsertCustomerByPhone(
  tx: Prisma.TransactionClient,
  input: { name: string; phone: string; email?: string | null; city?: string | null },
): Promise<{ id: bigint; created: boolean }> {
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const email = input.email?.trim() || null;
  const city = input.city?.trim() || null;

  const applyProfile = async (id: bigint) => {
    await tx.customers.update({
      where: { id },
      data: {
        name,
        ...(email ? { email } : {}),
        ...(city ? { city } : {}),
      },
    });
    return { id, created: false };
  };

  const existing = await tx.customers.findFirst({
    where: { phone: { in: phoneLookupVariants(phone) } },
  });
  if (existing) return applyProfile(existing.id);

  try {
    const created = await tx.customers.create({
      data: {
        name,
        phone,
        email,
        city,
        password_hash: null,
        is_active: true,
        app_status: "active",
      },
    });
    return { id: created.id, created: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await tx.customers.findFirst({
        where: { phone: { in: phoneLookupVariants(phone) } },
      });
      if (raced) return applyProfile(raced.id);
    }
    throw err;
  }
}

export type QuoteFareInput = {
  vehicleCategoryId: bigint;
  tripType: TripType;
  routeId?: bigint | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropLatitude?: number | null;
  dropLongitude?: number | null;
  /** Explicit distance override (e.g. fare estimator slider). */
  distanceKm?: number | null;
  couponCode?: string | null;
};

export type QuoteFareResult = {
  fare: FareBreakdown;
  distance_km: number;
  duration_minutes: number | null;
  provider: string | null;
  tariff: TariffPlans;
  coupon: Coupons | null;
  route_id: string | null;
  vehicle_category_id: string;
};

async function resolveTariff(vehicleCategoryId: bigint, tripType: TripType, routeId?: bigint | null) {
  const baseWhere = {
    vehicle_category_id: vehicleCategoryId,
    is_active: true,
    effective_from: { lte: new Date() },
    OR: [{ effective_to: null }, { effective_to: { gte: new Date() } }],
  };

  const tryTrip = async (tt: TripType) => {
    const withRoute =
      routeId != null
        ? await prisma.tariffPlans.findFirst({
            where: { ...baseWhere, trip_type: tt, route_id: routeId },
            orderBy: { effective_from: "desc" },
          })
        : null;
    if (withRoute) return withRoute;
    return prisma.tariffPlans.findFirst({
      where: { ...baseWhere, trip_type: tt, route_id: null },
      orderBy: { effective_from: "desc" },
    });
  };

  return (await tryTrip(tripType)) ?? (tripType !== "one_way" ? tryTrip("one_way") : null);
}

export async function quoteFare(input: QuoteFareInput): Promise<QuoteFareResult> {
  const category = await prisma.vehicleCategories.findFirst({
    where: { id: input.vehicleCategoryId, is_active: true },
  });
  if (!category) throw new ValidationError("Invalid vehicle category.");

  let route = null;
  if (input.routeId) {
    route = await prisma.routes.findFirst({ where: { id: input.routeId, is_active: true } });
    if (!route) throw new ValidationError("Invalid route.");
  }

  const tariffFinal = await resolveTariff(input.vehicleCategoryId, input.tripType, input.routeId ?? null);
  if (!tariffFinal) throw new ValidationError("No active tariff found for this trip.");

  let coupon: Coupons | null = null;
  if (input.couponCode) {
    coupon = await prisma.coupons.findFirst({
      where: {
        code: input.couponCode,
        is_active: true,
        valid_from: { lte: new Date() },
        valid_to: { gte: new Date() },
      },
    });
    if (!coupon) throw new ValidationError("Invalid or expired coupon.");
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
      throw new ValidationError("Coupon usage limit reached.");
    }
  }

  let distanceKm = 0;
  let durationMinutes: number | null = null;
  let provider: string | null = null;

  if (input.distanceKm != null && Number.isFinite(input.distanceKm) && input.distanceKm > 0) {
    distanceKm = input.distanceKm;
    durationMinutes = Math.round((distanceKm / 40) * 60);
    provider = "manual";
  } else if (
    input.pickupLatitude != null &&
    input.pickupLongitude != null &&
    input.dropLatitude != null &&
    input.dropLongitude != null
  ) {
    const est = await mapService.estimateRoute(
      { latitude: input.pickupLatitude, longitude: input.pickupLongitude },
      { latitude: input.dropLatitude, longitude: input.dropLongitude },
    );
    distanceKm = est.distance_km;
    durationMinutes = est.duration_minutes;
    provider = est.provider;
  } else if (route) {
    distanceKm = Number(route.distance_km);
    durationMinutes = route.duration_minutes;
    provider = "route";
  }

  const fare = calculateFare({
    distanceKm,
    tripType: input.tripType,
    tariff: tariffFinal,
    coupon,
  });

  return {
    fare,
    distance_km: fare.distance_km,
    duration_minutes: durationMinutes,
    provider,
    tariff: tariffFinal,
    coupon,
    route_id: route ? String(route.id) : null,
    vehicle_category_id: String(category.id),
  };
}

async function nextBookingRef(): Promise<string> {
  const setting = await prisma.appSettings.findUnique({ where: { setting_key: "booking_prefix" } });
  const prefix = setting?.setting_value || "CAB";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await prisma.bookings.count({ where: { created_at: { gte: start } } });
  let ref = bookingReference(prefix, new Date(), count + 1);
  // ensure unique
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.bookings.findUnique({ where: { booking_reference: ref } });
    if (!exists) return ref;
    ref = bookingReference(prefix, new Date(), count + 2 + i);
  }
  return bookingReference(prefix, new Date(), Date.now() % 10000);
}

async function writeHistory(params: {
  bookingId: bigint;
  oldStatus: string | null;
  newStatus: string;
  note?: string;
  changedByType: ChangedByType;
  adminId?: bigint | null;
  customerId?: bigint | null;
  driverId?: bigint | null;
}) {
  await prisma.bookingStatusHistory.create({
    data: {
      booking_id: params.bookingId,
      old_status: params.oldStatus,
      new_status: params.newStatus,
      note: params.note ?? null,
      changed_by_type: params.changedByType,
      changed_by_admin_id: params.adminId ?? null,
      changed_by_customer_id: params.customerId ?? null,
      changed_by_driver_id: params.driverId ?? null,
    },
  });
}

export type CreateBookingInput = {
  customerId?: bigint | null;
  vehicleCategoryId: bigint;
  routeId?: bigint | null;
  tripType: TripType;
  bookingSource?: BookingSource;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  pickupLocation: string;
  dropLocation: string;
  pickupCity?: string | null;
  dropCity?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropLatitude?: number | null;
  dropLongitude?: number | null;
  pickupAt: Date;
  returnAt?: Date | null;
  passengerCount?: number | null;
  luggageNote?: string | null;
  specialNote?: string | null;
  couponCode?: string | null;
  createdByAdminId?: bigint | null;
};

export const bookingService = {
  async quote(input: QuoteFareInput) {
    const quoted = await quoteFare(input);
    return {
      vehicle_category_id: quoted.vehicle_category_id,
      route_id: quoted.route_id,
      duration_minutes: quoted.duration_minutes,
      provider: quoted.provider,
      ...quoted.fare,
    };
  },

  async create(input: CreateBookingInput) {
    const quoted = await quoteFare({
      vehicleCategoryId: input.vehicleCategoryId,
      tripType: input.tripType,
      routeId: input.routeId,
      pickupLatitude: input.pickupLatitude,
      pickupLongitude: input.pickupLongitude,
      dropLatitude: input.dropLatitude,
      dropLongitude: input.dropLongitude,
      couponCode: input.couponCode,
    });
    const { fare, coupon } = quoted;

    const ref = await nextBookingRef();
    const phone = normalizePhone(input.customerPhone);
    let newCustomer = false;

    const booking = await prisma.$transaction(async (tx) => {
      if (coupon) {
        const locked = await tx.$queryRaw<Array<{ id: bigint; used_count: number; usage_limit: number | null }>>`
          SELECT id, used_count, usage_limit FROM coupons WHERE id = ${coupon.id} FOR UPDATE
        `;
        const row = locked[0];
        if (!row) throw new ValidationError("Invalid coupon.");
        if (row.usage_limit != null && row.used_count >= row.usage_limit) {
          throw new ConflictError("Coupon usage limit reached.");
        }
        await tx.coupons.update({
          where: { id: coupon.id },
          data: { used_count: { increment: 1 } },
        });
      }

      const customerId = input.customerId
        ? input.customerId
        : await (async () => {
            const upserted = await upsertCustomerByPhone(tx, {
              name: input.customerName,
              phone,
              email: input.customerEmail,
              city: input.pickupCity,
            });
            newCustomer = upserted.created;
            return upserted.id;
          })();

      const created = await tx.bookings.create({
        data: {
          booking_reference: ref,
          customer_id: customerId,
          vehicle_category_id: input.vehicleCategoryId,
          route_id: input.routeId ?? null,
          coupon_id: coupon?.id ?? null,
          trip_type: input.tripType,
          booking_source: input.bookingSource ?? "website",
          customer_name: input.customerName,
          customer_phone: phone,
          customer_email: input.customerEmail ?? null,
          pickup_location: input.pickupLocation,
          drop_location: input.dropLocation,
          pickup_city: input.pickupCity ?? null,
          drop_city: input.dropCity ?? null,
          pickup_latitude: input.pickupLatitude != null ? dec(input.pickupLatitude) : null,
          pickup_longitude: input.pickupLongitude != null ? dec(input.pickupLongitude) : null,
          drop_latitude: input.dropLatitude != null ? dec(input.dropLatitude) : null,
          drop_longitude: input.dropLongitude != null ? dec(input.dropLongitude) : null,
          pickup_at: input.pickupAt,
          return_at: input.returnAt ?? null,
          passenger_count: input.passengerCount ?? null,
          luggage_note: input.luggageNote ?? null,
          special_note: input.specialNote ?? null,
          estimated_distance_km: dec(fare.distance_km),
          estimated_duration_minutes: quoted.duration_minutes,
          rate_per_km: dec(fare.rate_per_km),
          base_fare: dec(fare.base_fare),
          driver_batta: dec(fare.driver_batta),
          minimum_fare: dec(fare.minimum_fare),
          extra_km_charge: dec(fare.extra_km_charge),
          extra_hour_charge: dec(fare.extra_hour_charge),
          toll_amount: dec(fare.toll_amount),
          parking_amount: dec(fare.parking_amount),
          permit_amount: dec(fare.permit_amount),
          night_charge: dec(fare.night_charge),
          waiting_charge: dec(fare.waiting_charge),
          discount_amount: dec(fare.discount_amount),
          gst_percentage: dec(fare.gst_percentage),
          gst_amount: dec(fare.gst_amount),
          estimated_total: dec(fare.estimated_total),
          status: "pending",
          created_by_admin_id: input.createdByAdminId ?? null,
        },
      });

      await tx.bookingCharges.createMany({
        data: [
          {
            booking_id: created.id,
            charge_type: "base_fare",
            description: "Base fare",
            amount: dec(fare.base_fare),
            amount_type: "estimated",
          },
          {
            booking_id: created.id,
            charge_type: "distance",
            description: "Distance fare",
            amount: dec(fare.distance_fare),
            amount_type: "estimated",
          },
          {
            booking_id: created.id,
            charge_type: "driver_batta",
            description: "Driver batta",
            amount: dec(fare.driver_batta),
            amount_type: "estimated",
          },
          {
            booking_id: created.id,
            charge_type: "discount",
            description: "Discount",
            amount: dec(fare.discount_amount),
            amount_type: "estimated",
          },
          {
            booking_id: created.id,
            charge_type: "gst",
            description: "GST",
            amount: dec(fare.gst_amount),
            amount_type: "estimated",
          },
        ],
      });

      await tx.bookingStatusHistory.create({
        data: {
          booking_id: created.id,
          old_status: null,
          new_status: "pending",
          note: "Booking created",
          changed_by_type: input.createdByAdminId ? "admin" : customerId ? "customer" : "system",
          changed_by_admin_id: input.createdByAdminId ?? null,
          changed_by_customer_id: customerId,
        },
      });

      return created;
    });

    if (booking.customer_id) {
      await deliverBookingNotification({
        recipientType: "customer",
        customerId: String(booking.customer_id),
        bookingId: String(booking.id),
        jobType: "notify_booking_created",
        title: "Booking received",
        body: `Your booking ${booking.booking_reference} is pending confirmation. Pickup: ${booking.pickup_location}.`,
      });
    }

    if (newCustomer) {
      await notifyAdmins({
        jobType: "notify_customer_created",
        title: "New customer",
        body: `${booking.customer_name} (${booking.customer_phone}) was added from a booking.`,
        customerId: booking.customer_id ? String(booking.customer_id) : null,
        extra: { type: "customer", customer_id: booking.customer_id ? String(booking.customer_id) : "" },
      });
    }

    if (!input.createdByAdminId) {
      const source = input.bookingSource === "customer_app" ? "the app" : "the website";
      await alertAdmins({
        booking,
        jobType: "notify_booking_created",
        title: "New booking",
        body: `${booking.customer_name} booked ${booking.booking_reference} from ${source}: ${booking.pickup_location} → ${booking.drop_location}.`,
      });
    }

    return serializeBooking(booking);
  },

  /**
   * Admin hard-assigns a driver (sets assigned_driver_id + driver_assigned).
   * Driver is notified the same way customers are (notification_logs + job queue).
   */
  async assignDriver(params: {
    bookingId: bigint;
    driverId: bigint;
    vehicleId?: bigint | null;
    adminId: bigint;
  }) {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: bigint;
          status: BookingStatus;
          assigned_driver_id: bigint | null;
          booking_reference: string;
          customer_id: bigint | null;
          customer_name: string;
          customer_phone: string;
          pickup_location: string;
          drop_location: string;
          pickup_at: Date;
          estimated_total: Prisma.Decimal | null;
        }>
      >`SELECT id, status, assigned_driver_id, booking_reference, customer_id, customer_name, customer_phone,
               pickup_location, drop_location, pickup_at, estimated_total
        FROM bookings WHERE id = ${params.bookingId} FOR UPDATE`;
      const booking = rows[0];
      if (!booking) throw new NotFoundError("Booking not found.");

      const assignable: BookingStatus[] = [
        "pending",
        "confirmed",
        "driver_notified",
        "driver_accepted",
        "driver_rejected",
      ];
      if (!assignable.includes(booking.status)) {
        throw new ConflictError(`Cannot assign driver while booking is ${booking.status}.`);
      }
      if (booking.assigned_driver_id && booking.assigned_driver_id !== params.driverId) {
        throw new ConflictError("Booking already has a different driver assigned.");
      }

      const driver = await tx.drivers.findUnique({ where: { id: params.driverId } });
      if (!driver || !driver.is_active) throw new NotFoundError("Driver not found.");

      let status: BookingStatus = booking.status;
      if (status === "pending") {
        await tx.bookings.update({
          where: { id: booking.id },
          data: { status: "confirmed", confirmed_at: new Date() },
        });
        await tx.bookingStatusHistory.create({
          data: {
            booking_id: booking.id,
            old_status: "pending",
            new_status: "confirmed",
            note: "Auto-confirmed on driver assign",
            changed_by_type: "admin",
            changed_by_admin_id: params.adminId,
          },
        });
        status = "confirmed";
      }

      const vehicleId =
        params.vehicleId ??
        (
          await tx.driverVehicleAssignments.findFirst({
            where: { driver_id: params.driverId, is_current: true },
            select: { vehicle_id: true },
          })
        )?.vehicle_id ??
        null;

      // Expire any open offers, then record this assign as an accepted manual offer.
      await tx.bookingDriverOffers.updateMany({
        where: {
          booking_id: booking.id,
          status: { in: ["sent", "seen"] },
        },
        data: { status: "expired" },
      });

      const offer = await tx.bookingDriverOffers.create({
        data: {
          booking_id: booking.id,
          driver_id: params.driverId,
          vehicle_id: vehicleId,
          offer_type: "manual_assign",
          status: "accepted",
          sent_by_admin_id: params.adminId,
          responded_at: new Date(),
          expires_at: new Date(),
        },
      });

      const updated = await tx.bookings.update({
        where: { id: booking.id },
        data: {
          status: "driver_assigned",
          assigned_driver_id: params.driverId,
          assigned_vehicle_id: vehicleId,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          booking_id: booking.id,
          old_status: status,
          new_status: "driver_assigned",
          note: `Driver assigned by admin: ${driver.name}`,
          changed_by_type: "admin",
          changed_by_admin_id: params.adminId,
        },
      });

      await tx.tripEvents.create({
        data: {
          booking_id: booking.id,
          driver_id: params.driverId,
          event_type: "driver_assigned",
          created_by_type: "admin",
          created_by_admin_id: params.adminId,
        },
      });

      await tx.drivers.update({
        where: { id: params.driverId },
        data: { online_status: "busy", availability_status: "on_trip" },
      });

      return {
        booking: updated,
        offerId: offer.id,
        driver,
        previousStatus: booking.status,
      };
    });

    const b = result.booking;
    const pickupTime = b.pickup_at.toISOString();

    await deliverBookingNotification({
      recipientType: "driver",
      driverId: String(params.driverId),
      bookingId: String(b.id),
      jobType: "notify_driver_assigned",
      title: "New trip assigned",
      body: `Trip ${b.booking_reference}: ${b.pickup_location} → ${b.drop_location}. Pickup ${pickupTime}. Fare ≈ ₹${b.estimated_total?.toString() ?? "0"}.`,
    });

    if (b.customer_id) {
      await deliverBookingNotification({
        recipientType: "customer",
        customerId: String(b.customer_id),
        bookingId: String(b.id),
        jobType: "notify_booking_driver_assigned",
        title: "Driver assigned",
        body: `Driver ${result.driver.name} (${result.driver.phone}) is assigned to your booking ${b.booking_reference}.`,
      });
    }

    if (result.previousStatus === "pending") {
      try {
        const { sendBookingInvoiceEmail } = await import("./invoice.service.js");
        await sendBookingInvoiceEmail(b.id);
      } catch (err) {
        console.error("Invoice email after assign failed:", err instanceof Error ? err.message : err);
      }
    }

    return serializeBooking(b);
  },

  /**
   * Driver starts the trip — requires current odometer reading.
   * Advances from driver_assigned / on_the_way / arrived → trip_started.
   */
  async startTrip(bookingId: bigint, driverId: bigint, startOdometerKm: number) {
    if (!Number.isFinite(startOdometerKm) || startOdometerKm < 0) {
      throw new ValidationError("Start odometer reading is required and must be 0 or greater.");
    }
    const startKm = Math.round(startOdometerKm * 100) / 100;

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: bigint;
          status: BookingStatus;
          assigned_driver_id: bigint | null;
          start_odometer_km: Prisma.Decimal | null;
        }>
      >`SELECT id, status, assigned_driver_id, start_odometer_km FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = rows[0];
      if (!booking) throw new NotFoundError("Booking not found.");
      if (booking.assigned_driver_id !== driverId) throw new NotFoundError("Trip not found.");

      const startable: BookingStatus[] = ["driver_assigned", "on_the_way", "arrived"];
      if (booking.status === "trip_started" && booking.start_odometer_km != null) {
        throw new ConflictError("Trip already started with an odometer reading.");
      }
      if (!startable.includes(booking.status) && booking.status !== "trip_started") {
        throw new ConflictError(`Cannot start trip while status is ${booking.status}.`);
      }

      const advance: BookingStatus[] = [];
      if (booking.status === "driver_assigned") advance.push("on_the_way", "arrived", "trip_started");
      else if (booking.status === "on_the_way") advance.push("arrived", "trip_started");
      else if (booking.status === "arrived") advance.push("trip_started");
      else if (booking.status === "trip_started") {
        // allow setting missing start odometer only
      }

      let from = booking.status;
      let result = null as Awaited<ReturnType<typeof tx.bookings.update>> | null;

      for (const to of advance) {
        result = await tx.bookings.update({
          where: { id: bookingId },
          data: {
            status: to,
            ...(to === "trip_started" ? { start_odometer_km: new Prisma.Decimal(startKm) } : {}),
          },
        });
        await tx.bookingStatusHistory.create({
          data: {
            booking_id: bookingId,
            old_status: from,
            new_status: to,
            note:
              to === "trip_started"
                ? `Trip started · odometer ${startKm} km`
                : `Auto-advanced on start (${to})`,
            changed_by_type: "driver",
            changed_by_driver_id: driverId,
          },
        });
        from = to;
      }

      if (booking.status === "trip_started" && booking.start_odometer_km == null) {
        result = await tx.bookings.update({
          where: { id: bookingId },
          data: { start_odometer_km: new Prisma.Decimal(startKm) },
        });
        await tx.bookingStatusHistory.create({
          data: {
            booking_id: bookingId,
            old_status: "trip_started",
            new_status: "trip_started",
            note: `Start odometer recorded: ${startKm} km`,
            changed_by_type: "driver",
            changed_by_driver_id: driverId,
          },
        });
      }

      await tx.tripEvents.create({
        data: {
          booking_id: bookingId,
          driver_id: driverId,
          event_type: "trip_started",
          event_note: `Start odometer: ${startKm} km`,
          event_payload: { start_odometer_km: startKm },
          created_by_type: "driver",
        },
      });

      if (!result) throw new ConflictError("Start trip failed.");
      return result;
    });

    if (updated.customer_id) {
      await deliverBookingNotification({
        recipientType: "customer",
        customerId: String(updated.customer_id),
        bookingId: String(updated.id),
        jobType: "notify_trip_started",
        title: "Trip started",
        body: `Your trip ${updated.booking_reference} has started.`,
      });
    }
    await alertAdmins({
      booking: updated,
      jobType: "notify_trip_started",
      title: "Trip started",
      body: `Driver started trip ${updated.booking_reference}: ${updated.pickup_location} → ${updated.drop_location}.`,
    });

    return serializeBooking(updated);
  },

  /**
   * Driver closes the trip — requires current (end) odometer reading.
   * Trip must already be started with a start odometer.
   */
  async closeTrip(bookingId: bigint, driverId: bigint, endOdometerKm: number) {
    if (!Number.isFinite(endOdometerKm) || endOdometerKm < 0) {
      throw new ValidationError("End odometer reading is required and must be 0 or greater.");
    }
    const endKm = Math.round(endOdometerKm * 100) / 100;

    const final = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: bigint;
          status: BookingStatus;
          assigned_driver_id: bigint | null;
          estimated_total: Prisma.Decimal | null;
          start_odometer_km: Prisma.Decimal | null;
        }>
      >`SELECT id, status, assigned_driver_id, estimated_total, start_odometer_km
        FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = rows[0];
      if (!booking) throw new NotFoundError("Booking not found.");
      if (booking.assigned_driver_id !== driverId) throw new NotFoundError("Trip not found.");

      if (booking.status !== "trip_started") {
        throw new ConflictError(
          booking.start_odometer_km == null
            ? "Start the trip and enter the start odometer reading before closing."
            : `Cannot close trip while status is ${booking.status}.`,
        );
      }
      if (booking.start_odometer_km == null) {
        throw new ConflictError("Start odometer reading is missing. Start the trip again with odometer.");
      }

      const startKm = Number(booking.start_odometer_km);
      if (endKm < startKm) {
        throw new ValidationError(
          `End odometer (${endKm} km) cannot be less than start odometer (${startKm} km).`,
        );
      }
      const actualKm = Math.round((endKm - startKm) * 100) / 100;

      const updated = await tx.bookings.update({
        where: { id: bookingId },
        data: {
          status: "completed",
          completed_at: new Date(),
          final_total: booking.estimated_total,
          end_odometer_km: new Prisma.Decimal(endKm),
          actual_distance_km: new Prisma.Decimal(actualKm),
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          booking_id: bookingId,
          old_status: "trip_started",
          new_status: "completed",
          note: `Trip closed · odometer ${startKm} → ${endKm} km (distance ${actualKm} km)`,
          changed_by_type: "driver",
          changed_by_driver_id: driverId,
        },
      });

      await tx.tripEvents.create({
        data: {
          booking_id: bookingId,
          driver_id: driverId,
          event_type: "trip_completed",
          event_note: `End odometer: ${endKm} km · distance ${actualKm} km`,
          event_payload: {
            start_odometer_km: startKm,
            end_odometer_km: endKm,
            actual_distance_km: actualKm,
          },
          created_by_type: "driver",
        },
      });

      await tx.drivers.update({
        where: { id: driverId },
        data: {
          online_status: "online",
          availability_status: "available",
          total_completed_trips: { increment: 1 },
        },
      });

      return updated;
    });

    if (final.customer_id) {
      await deliverBookingNotification({
        recipientType: "customer",
        customerId: String(final.customer_id),
        bookingId: String(final.id),
        jobType: "notify_booking_completed",
        title: "Trip completed",
        body: `Your trip ${final.booking_reference} is complete. Thank you for riding with Yaazh Cabs.`,
      });
    }
    await alertAdmins({
      booking: final,
      jobType: "notify_booking_completed",
      title: "Trip completed",
      body: `Trip ${final.booking_reference} is complete (${final.customer_name}).`,
    });

    try {
      const { sendBookingInvoiceEmail } = await import("./invoice.service.js");
      await sendBookingInvoiceEmail(final.id);
    } catch (err) {
      console.error("Invoice email after trip close failed:", err instanceof Error ? err.message : err);
    }

    return serializeBooking(final);
  },

  async trackPublic(bookingReference: string, customerPhone: string) {
    const ref = bookingReference.trim().toUpperCase();
    const phone = normalizePhone(customerPhone);
    if (!ref || phone.length < 8) throw new ValidationError("Booking reference and phone are required.");

    const booking = await prisma.bookings.findFirst({
      where: {
        booking_reference: ref,
        OR: [
          { customer_phone: phone },
          { customer_phone: `91${phone}` },
          { customer_phone: `+91${phone}` },
        ],
      },
    });
    if (!booking) throw new NotFoundError("Booking not found.");

    const history = await prisma.bookingStatusHistory.findMany({
      where: { booking_id: booking.id },
      orderBy: { changed_at: "asc" },
    });

    let driver: ReturnType<typeof serializeDriverParty> = null;
    let vehicle: { name: string; registration: string | null } | null = null;

    if (booking.assigned_driver_id) {
      const [d, photos] = await Promise.all([
        prisma.drivers.findUnique({ where: { id: booking.assigned_driver_id } }),
        loadDriverPhotoUrls([booking.assigned_driver_id]),
      ]);
      driver = serializeDriverParty(d, photos.get(String(booking.assigned_driver_id)));
    }
    if (booking.assigned_vehicle_id) {
      const v = await prisma.vehicles.findUnique({ where: { id: booking.assigned_vehicle_id } });
      if (v) vehicle = { name: v.vehicle_name, registration: v.registration_no };
    }

    return {
      id: String(booking.id),
      booking_reference: booking.booking_reference,
      status: booking.status ?? "pending",
      trip_type: booking.trip_type,
      payment_status: booking.payment_status,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      pickup_location: booking.pickup_location,
      drop_location: booking.drop_location,
      pickup_at: booking.pickup_at.toISOString(),
      pickup_latitude: booking.pickup_latitude != null ? Number(booking.pickup_latitude) : null,
      pickup_longitude: booking.pickup_longitude != null ? Number(booking.pickup_longitude) : null,
      drop_latitude: booking.drop_latitude != null ? Number(booking.drop_latitude) : null,
      drop_longitude: booking.drop_longitude != null ? Number(booking.drop_longitude) : null,
      estimated_total: booking.estimated_total?.toString() ?? "0",
      final_total: booking.final_total?.toString() ?? null,
      estimated_distance_km: booking.estimated_distance_km != null ? Number(booking.estimated_distance_km) : null,
      driver,
      vehicle,
      status_history: history.map((h) => ({
        old_status: h.old_status,
        new_status: h.new_status,
        note: h.note,
        changed_at: h.changed_at.toISOString(),
      })),
    };
  },

  async getCustomerDetail(bookingId: bigint, customerId: bigint) {
    const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
    if (!booking || booking.customer_id !== customerId) throw new NotFoundError("Booking not found.");

    const history = await prisma.bookingStatusHistory.findMany({
      where: { booking_id: booking.id },
      orderBy: { changed_at: "asc" },
    });

    let driver: ReturnType<typeof serializeDriverParty> = null;
    let vehicle: { name: string; registration: string | null } | null = null;

    if (booking.assigned_driver_id) {
      const [d, photos] = await Promise.all([
        prisma.drivers.findUnique({ where: { id: booking.assigned_driver_id } }),
        loadDriverPhotoUrls([booking.assigned_driver_id]),
      ]);
      driver = serializeDriverParty(d, photos.get(String(booking.assigned_driver_id)));
    }
    if (booking.assigned_vehicle_id) {
      const v = await prisma.vehicles.findUnique({ where: { id: booking.assigned_vehicle_id } });
      if (v) vehicle = { name: v.vehicle_name, registration: v.registration_no };
    }

    const rating = await prisma.tripRatings.findUnique({
      where: { booking_id: booking.id },
    });

    return {
      ...serializeBooking(booking),
      driver,
      vehicle,
      customer_rating: rating?.customer_rating ?? null,
      customer_review: rating?.customer_review ?? null,
      status_history: history.map((h) => ({
        old_status: h.old_status,
        new_status: h.new_status,
        note: h.note,
        changed_at: h.changed_at.toISOString(),
      })),
    };
  },

  async transition(params: {
    bookingId: bigint;
    to: BookingStatus;
    note?: string;
    actor: { type: ChangedByType; adminId?: bigint; customerId?: bigint; driverId?: bigint };
    extra?: Prisma.BookingsUpdateInput;
  }) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: bigint; status: BookingStatus }>>`
        SELECT id, status FROM bookings WHERE id = ${params.bookingId} FOR UPDATE
      `;
      const row = rows[0];
      if (!row) throw new NotFoundError("Booking not found.");
      assertTransition(row.status, params.to);

      const updated = await tx.bookings.update({
        where: { id: params.bookingId },
        data: {
          status: params.to,
          ...(params.to === "confirmed" ? { confirmed_at: new Date() } : {}),
          ...(params.to === "completed" ? { completed_at: new Date() } : {}),
          ...(params.to === "cancelled"
            ? {
                cancelled_at: new Date(),
                cancelled_by_type:
                  params.actor.type === "system"
                    ? "system"
                    : params.actor.type === "admin"
                      ? "admin"
                      : params.actor.type === "customer"
                        ? "customer"
                        : "driver",
                cancellation_reason: params.note ?? null,
              }
            : {}),
          ...params.extra,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          booking_id: params.bookingId,
          old_status: row.status,
          new_status: params.to,
          note: params.note ?? null,
          changed_by_type: params.actor.type,
          changed_by_admin_id: params.actor.adminId ?? null,
          changed_by_customer_id: params.actor.customerId ?? null,
          changed_by_driver_id: params.actor.driverId ?? null,
        },
      });

      return serializeBooking(updated);
    });
  },

  async cancel(bookingId: bigint, actor: { type: ChangedByType; adminId?: bigint; customerId?: bigint; driverId?: bigint }, reason?: string) {
    const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking not found.");
    if (actor.type === "customer" && booking.customer_id !== actor.customerId) {
      throw new AppError(403, "Forbidden.");
    }
    if (!canCancel(booking.status)) throw new ConflictError("Booking cannot be cancelled in current status.");
    const cancelled = await this.transition({
      bookingId,
      to: "cancelled",
      note: reason,
      actor,
    });
    if (booking.customer_id) {
      await deliverBookingNotification({
        recipientType: "customer",
        customerId: String(booking.customer_id),
        bookingId: String(bookingId),
        jobType: "notify_booking_cancelled",
        title: "Booking cancelled",
        body: reason
          ? `Your booking ${booking.booking_reference} was cancelled. ${reason}`
          : `Your booking ${booking.booking_reference} was cancelled.`,
      });
    }
    if (actor.type !== "admin") {
      await alertAdmins({
        booking,
        jobType: "notify_booking_cancelled",
        title: "Booking cancelled",
        body: reason
          ? `${booking.booking_reference} was cancelled. ${reason}`
          : `${booking.booking_reference} was cancelled.`,
      });
    }
    return cancelled;
  },

  async acceptOffer(offerId: bigint, driverId: bigint) {
    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.bookingDriverOffers.findUnique({ where: { id: offerId } });
      if (!offer || offer.driver_id !== driverId) throw new NotFoundError("Offer not found.");
      if (offer.status !== "sent" && offer.status !== "seen") {
        throw new ConflictError("Offer is no longer available.");
      }
      if (offer.expires_at && offer.expires_at < new Date()) {
        throw new ConflictError("Offer expired.");
      }

      const bookings = await tx.$queryRaw<
        Array<{ id: bigint; status: BookingStatus; assigned_driver_id: bigint | null }>
      >`SELECT id, status, assigned_driver_id FROM bookings WHERE id = ${offer.booking_id} FOR UPDATE`;
      const booking = bookings[0];
      if (!booking) throw new NotFoundError("Booking not found.");
      if (booking.assigned_driver_id) throw new ConflictError("Booking already assigned.");
      if (!["confirmed", "driver_notified", "driver_rejected"].includes(booking.status)) {
        throw new ConflictError("Booking not open for driver acceptance.");
      }

      await tx.bookingDriverOffers.update({
        where: { id: offerId },
        data: { status: "accepted", responded_at: new Date() },
      });

      await tx.bookingDriverOffers.updateMany({
        where: {
          booking_id: offer.booking_id,
          id: { not: offerId },
          status: { in: ["sent", "seen"] },
        },
        data: { status: "expired" },
      });

      const vehicleId =
        offer.vehicle_id ??
        (
          await tx.driverVehicleAssignments.findFirst({
            where: { driver_id: driverId, is_current: true },
            select: { vehicle_id: true },
          })
        )?.vehicle_id ??
        null;

      const updated = await tx.bookings.update({
        where: { id: offer.booking_id },
        data: {
          status: "driver_assigned",
          assigned_driver_id: driverId,
          assigned_vehicle_id: vehicleId,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          booking_id: offer.booking_id,
          old_status: booking.status,
          new_status: "driver_assigned",
          note: "Driver accepted offer",
          changed_by_type: "driver",
          changed_by_driver_id: driverId,
        },
      });

      await tx.tripEvents.create({
        data: {
          booking_id: offer.booking_id,
          driver_id: driverId,
          event_type: "driver_accepted",
          created_by_type: "driver",
        },
      });

      await tx.tripEvents.create({
        data: {
          booking_id: offer.booking_id,
          driver_id: driverId,
          event_type: "driver_assigned",
          created_by_type: "system",
        },
      });

      await tx.drivers.update({
        where: { id: driverId },
        data: { online_status: "busy", availability_status: "on_trip" },
      });

      return updated;
    });

    if (result.customer_id) {
      await deliverBookingNotification({
        recipientType: "customer",
        customerId: String(result.customer_id),
        bookingId: String(result.id),
        jobType: "notify_booking_driver_assigned",
        title: "Driver assigned",
        body: `A driver has accepted your booking ${result.booking_reference}.`,
      });
    }
    await alertAdmins({
      booking: result,
      jobType: "notify_booking_driver_assigned",
      title: "Driver accepted trip",
      body: `A driver accepted ${result.booking_reference}: ${result.pickup_location} → ${result.drop_location}.`,
    });

    return serializeBooking(result);
  },
};

export function serializeBooking(b: {
  id: bigint;
  booking_reference: string;
  status: string | null;
  estimated_total: { toString(): string } | null;
  final_total?: { toString(): string } | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  pickup_location: string;
  drop_location: string;
  pickup_at: Date;
  trip_type: string;
  payment_status: string;
  assigned_driver_id?: bigint | null;
  estimated_distance_km?: { toString(): string } | null;
  actual_distance_km?: { toString(): string } | null;
  start_odometer_km?: { toString(): string } | null;
  end_odometer_km?: { toString(): string } | null;
  pickup_latitude?: { toString(): string } | null;
  pickup_longitude?: { toString(): string } | null;
  drop_latitude?: { toString(): string } | null;
  drop_longitude?: { toString(): string } | null;
}) {
  const startOdo = b.start_odometer_km != null ? Number(b.start_odometer_km) : null;
  const endOdo = b.end_odometer_km != null ? Number(b.end_odometer_km) : null;
  const actual =
    b.actual_distance_km != null
      ? Number(b.actual_distance_km)
      : startOdo != null && endOdo != null
        ? Math.round((endOdo - startOdo) * 100) / 100
        : null;

  return {
    id: String(b.id),
    booking_reference: b.booking_reference,
    status: b.status ?? "pending",
    trip_type: b.trip_type,
    payment_status: b.payment_status,
    customer_name: b.customer_name,
    customer_phone: b.customer_phone,
    customer_email: b.customer_email ?? null,
    pickup_location: b.pickup_location,
    drop_location: b.drop_location,
    pickup_at: b.pickup_at.toISOString(),
    pickup_latitude: b.pickup_latitude != null ? Number(b.pickup_latitude) : null,
    pickup_longitude: b.pickup_longitude != null ? Number(b.pickup_longitude) : null,
    drop_latitude: b.drop_latitude != null ? Number(b.drop_latitude) : null,
    drop_longitude: b.drop_longitude != null ? Number(b.drop_longitude) : null,
    estimated_total: b.estimated_total?.toString() ?? "0",
    final_total: b.final_total?.toString() ?? null,
    assigned_driver_id: b.assigned_driver_id != null ? String(b.assigned_driver_id) : null,
    estimated_distance_km:
      b.estimated_distance_km != null ? Number(b.estimated_distance_km) : null,
    start_odometer_km: startOdo,
    end_odometer_km: endOdo,
    actual_distance_km: actual,
    odometer_difference_km: actual,
  };
}

export async function loadDriverPhotoUrls(driverIds: bigint[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (driverIds.length === 0) return map;
  const docs = await prisma.driverDocuments.findMany({
    where: { driver_id: { in: driverIds }, document_type: "profile_photo" },
    orderBy: { created_at: "desc" },
    select: { driver_id: true, file_url: true },
  });
  for (const doc of docs) {
    const key = String(doc.driver_id);
    const path = publicMediaPath(doc.file_url);
    if (path && !map.has(key)) map.set(key, path);
  }
  return map;
}

export function serializeDriverParty(
  d: { id?: bigint; name: string; phone: string; profile_image_url?: string | null } | null | undefined,
  photoOverride?: string | null,
) {
  if (!d) return null;
  const stored = publicMediaPath(d.profile_image_url) ?? publicMediaPath(photoOverride);
  const id = d.id != null ? String(d.id) : undefined;
  const photo = id ? driverPhotoPublicPath(id) : stored;
  return {
    id,
    name: d.name,
    phone: d.phone,
    photo_url: photo ?? null,
    profile_image_url: stored,
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getBookingPaymentSummary(bookingId: bigint) {
  const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking not found.");

  const payments = await prisma.payments.findMany({
    where: { booking_id: bookingId, status: "success" },
    orderBy: { created_at: "asc" },
  });

  const fareDue = roundMoney(Number(booking.final_total ?? booking.estimated_total ?? 0));
  const amountPaid = roundMoney(payments.reduce((sum, p) => sum + Number(p.amount), 0));
  const balanceDue = roundMoney(Math.max(0, fareDue - amountPaid));

  return {
    booking_id: String(booking.id),
    booking_reference: booking.booking_reference,
    payment_status: booking.payment_status,
    fare_due: fareDue,
    estimated_total: Number(booking.estimated_total ?? 0),
    final_total: booking.final_total != null ? Number(booking.final_total) : null,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    currency: "INR",
    payments: payments.map((p) => ({
      id: String(p.id),
      amount: Number(p.amount),
      method: p.method,
      payment_type: p.payment_type,
      status: p.status,
      paid_at: p.paid_at?.toISOString() ?? null,
      created_at: p.created_at.toISOString(),
    })),
  };
}

export async function recordBookingPayment(params: {
  bookingId: bigint;
  amount: number;
  method?: "cash" | "upi" | "card" | "wallet" | "bank_transfer" | "other";
  note?: string | null;
  actor: { type: "admin" | "driver"; adminId?: bigint; driverId?: bigint };
  /** Admin may record even if amount exceeds current balance (adjustment). */
  allowOverpay?: boolean;
}) {
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new ValidationError("Payment amount must be greater than 0.");
  }
  const amount = roundMoney(params.amount);
  const method = params.method ?? "cash";

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: bigint;
        status: string;
        assigned_driver_id: bigint | null;
        estimated_total: Prisma.Decimal | null;
        final_total: Prisma.Decimal | null;
        payment_status: string;
        booking_reference: string;
      }>
    >`SELECT id, status, assigned_driver_id, estimated_total, final_total, payment_status, booking_reference
      FROM bookings WHERE id = ${params.bookingId} FOR UPDATE`;
    const booking = rows[0];
    if (!booking) throw new NotFoundError("Booking not found.");

    if (params.actor.type === "driver") {
      if (!params.actor.driverId || booking.assigned_driver_id !== params.actor.driverId) {
        throw new NotFoundError("Trip not found.");
      }
      const collectable = ["trip_started", "completed", "arrived", "on_the_way", "driver_assigned"];
      if (!collectable.includes(booking.status)) {
        throw new ConflictError(`Cannot collect payment while trip status is ${booking.status}.`);
      }
    }

    const paidAgg = await tx.payments.aggregate({
      where: { booking_id: booking.id, status: "success" },
      _sum: { amount: true },
    });
    const alreadyPaid = roundMoney(Number(paidAgg._sum.amount ?? 0));
    const fareDue = roundMoney(Number(booking.final_total ?? booking.estimated_total ?? 0));
    const balanceBefore = roundMoney(Math.max(0, fareDue - alreadyPaid));

    if (!params.allowOverpay && amount > balanceBefore + 0.009) {
      throw new ValidationError(`Amount ₹${amount} exceeds balance due ₹${balanceBefore}.`);
    }

    const paymentType = amount >= balanceBefore - 0.009 ? "final" : alreadyPaid > 0 ? "partial" : "advance";
    const prefix = params.actor.type === "admin" ? "ADM" : "DRV";
    const payment = await tx.payments.create({
      data: {
        booking_id: booking.id,
        payment_reference: `${prefix}-${booking.id}-${Date.now()}`,
        method,
        payment_type: paymentType,
        amount: new Prisma.Decimal(amount),
        currency: "INR",
        status: "success",
        paid_at: new Date(),
        gateway: params.actor.type === "admin" ? "admin_payment" : "driver_cash_collection",
        gateway_response: {
          note: params.note ?? null,
          collected_by_admin_id: params.actor.adminId != null ? String(params.actor.adminId) : null,
          collected_by_driver_id: params.actor.driverId != null ? String(params.actor.driverId) : null,
        },
      },
    });

    const amountPaid = roundMoney(alreadyPaid + amount);
    const balanceDue = roundMoney(Math.max(0, fareDue - amountPaid));
    const paymentStatus = balanceDue <= 0 ? "paid" : amountPaid > 0 ? "partial" : "unpaid";

    await tx.bookings.update({
      where: { id: booking.id },
      data: { payment_status: paymentStatus },
    });

    const invoice = await tx.bookingInvoices.findUnique({ where: { booking_id: booking.id } });
    if (invoice) {
      await tx.bookingInvoices.update({
        where: { id: invoice.id },
        data: {
          amount_paid: new Prisma.Decimal(amountPaid),
          balance_amount: new Prisma.Decimal(balanceDue),
          status: balanceDue <= 0 ? "paid" : amountPaid > 0 ? "partially_paid" : invoice.status,
        },
      });
    }

    await tx.tripEvents.create({
      data: {
        booking_id: booking.id,
        driver_id: params.actor.driverId ?? booking.assigned_driver_id,
        event_type: "payment_collected",
        event_note: `${params.actor.type === "admin" ? "Admin" : "Driver"} recorded ₹${amount} via ${method} · balance ₹${balanceDue}`,
        event_payload: {
          payment_id: String(payment.id),
          amount,
          method,
          balance_due: balanceDue,
          actor: params.actor.type,
        },
        created_by_type: params.actor.type,
        created_by_admin_id: params.actor.adminId ?? null,
      },
    });

    return {
      payment_id: String(payment.id),
      booking_id: String(booking.id),
      booking_reference: booking.booking_reference,
      amount,
      method,
      payment_type: paymentType,
      fare_due: fareDue,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      payment_status: paymentStatus,
    };
  });

  return result;
}

export async function collectBookingPayment(params: {
  bookingId: bigint;
  driverId: bigint;
  amount: number;
  method?: "cash" | "upi" | "card" | "wallet" | "other";
  note?: string | null;
}) {
  return recordBookingPayment({
    bookingId: params.bookingId,
    amount: params.amount,
    method: params.method,
    note: params.note,
    actor: { type: "driver", driverId: params.driverId },
  });
}

export async function setBookingPaymentStatus(params: {
  bookingId: bigint;
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded" | "failed";
  adminId: bigint;
  note?: string | null;
}) {
  const booking = await prisma.bookings.findUnique({ where: { id: params.bookingId } });
  if (!booking) throw new NotFoundError("Booking not found.");

  // Balance / paid amounts come from the payments table — marking paid must settle remaining.
  if (params.paymentStatus === "paid") {
    const paidAgg = await prisma.payments.aggregate({
      where: { booking_id: params.bookingId, status: "success" },
      _sum: { amount: true },
    });
    const alreadyPaid = roundMoney(Number(paidAgg._sum.amount ?? 0));
    const fareDue = roundMoney(Number(booking.final_total ?? booking.estimated_total ?? 0));
    const balanceDue = roundMoney(Math.max(0, fareDue - alreadyPaid));

    if (balanceDue > 0) {
      await recordBookingPayment({
        bookingId: params.bookingId,
        amount: balanceDue,
        method: "other",
        note: params.note ?? "Marked fully paid by admin",
        actor: { type: "admin", adminId: params.adminId },
        allowOverpay: true,
      });
    } else if (booking.payment_status !== "paid") {
      await prisma.bookings.update({
        where: { id: params.bookingId },
        data: { payment_status: "paid" },
      });
    }

    return getBookingPaymentSummary(params.bookingId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookings.update({
      where: { id: params.bookingId },
      data: { payment_status: params.paymentStatus },
    });
    await tx.tripEvents.create({
      data: {
        booking_id: params.bookingId,
        driver_id: booking.assigned_driver_id,
        event_type: "payment_collected",
        event_note: params.note ?? `Payment status set to ${params.paymentStatus}`,
        event_payload: {
          old_status: booking.payment_status,
          new_status: params.paymentStatus,
          source: "admin_status_update",
        },
        created_by_type: "admin",
        created_by_admin_id: params.adminId,
      },
    });

    const invoice = await tx.bookingInvoices.findUnique({ where: { booking_id: params.bookingId } });
    if (invoice && params.paymentStatus === "unpaid") {
      const fareDue = roundMoney(Number(booking.final_total ?? booking.estimated_total ?? 0));
      await tx.bookingInvoices.update({
        where: { id: invoice.id },
        data: {
          amount_paid: new Prisma.Decimal(0),
          balance_amount: new Prisma.Decimal(fareDue),
          status: "issued",
        },
      });
    }
  });

  return getBookingPaymentSummary(params.bookingId);
}
