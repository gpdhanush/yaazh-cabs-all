import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors/app-error.js";
import { serializeDriverParty } from "./booking.service.js";

export function signFeedbackToken(bookingId: bigint): string {
  const id = String(bookingId);
  const sig = createHmac("sha256", loadEnv().JWT_SECRET)
    .update(`feedback:${id}`)
    .digest("hex")
    .slice(0, 24);
  return `${id}.${sig}`;
}

export function parseFeedbackToken(token: string): bigint | null {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [id, sig] = parts;
  if (!id || !/^\d+$/.test(id) || !sig) return null;
  const expected = createHmac("sha256", loadEnv().JWT_SECRET)
    .update(`feedback:${id}`)
    .digest("hex")
    .slice(0, 24);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export function whatsappDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${whatsappDigits(phone)}?text=${encodeURIComponent(message)}`;
}

export function publicWebOrigin(): string {
  return loadEnv().PUBLIC_WEB_URL.replace(/\/$/, "");
}

export function feedbackPageUrl(bookingId: bigint): string {
  return `${publicWebOrigin()}/feedback/${signFeedbackToken(bookingId)}`;
}

export async function getPublicFeedback(token: string) {
  const bookingId = parseFeedbackToken(token);
  if (!bookingId) throw new NotFoundError("Feedback link is invalid.");
  const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking not found.");

  const [driver, vehicle, rating] = await Promise.all([
    booking.assigned_driver_id
      ? prisma.drivers.findUnique({ where: { id: booking.assigned_driver_id } })
      : Promise.resolve(null),
    booking.assigned_vehicle_id
      ? prisma.vehicles.findUnique({ where: { id: booking.assigned_vehicle_id } })
      : Promise.resolve(null),
    prisma.tripRatings.findUnique({ where: { booking_id: bookingId } }),
  ]);

  return {
    booking_reference: booking.booking_reference,
    status: booking.status,
    trip_type: booking.trip_type,
    customer_name: booking.customer_name,
    pickup_location: booking.pickup_location,
    drop_location: booking.drop_location,
    pickup_at: booking.pickup_at.toISOString(),
    completed_at: booking.completed_at?.toISOString() ?? null,
    estimated_total: Number(booking.estimated_total ?? 0),
    final_total: booking.final_total != null ? Number(booking.final_total) : null,
    can_submit: booking.status === "completed",
    already_submitted: rating?.customer_rating != null,
    submitted_rating: rating?.customer_rating ?? null,
    submitted_review: rating?.customer_review ?? null,
    driver: serializeDriverParty(driver),
    vehicle: vehicle
      ? {
          name: vehicle.vehicle_name,
          registration: vehicle.registration_no,
        }
      : null,
  };
}

export async function submitPublicFeedback(
  token: string,
  input: { rating: number; review?: string | null },
) {
  const bookingId = parseFeedbackToken(token);
  if (!bookingId) throw new NotFoundError("Feedback link is invalid.");
  const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking not found.");
  if (booking.status !== "completed") {
    throw new ForbiddenError("Feedback opens after the trip is completed.");
  }
  return submitCustomerTripRating(booking, input.rating, input.review);
}

export async function submitCustomerTripRating(
  booking: {
    id: bigint;
    customer_id: bigint | null;
    assigned_driver_id: bigint | null;
    customer_name: string;
    customer_phone: string;
  },
  rating: number,
  review?: string | null,
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError("Rating must be between 1 and 5.");
  }
  const reviewText = (review ?? "").trim() || "Great trip with Yaazh Cabs.";

  const row = await prisma.tripRatings.upsert({
    where: { booking_id: booking.id },
    create: {
      booking_id: booking.id,
      customer_id: booking.customer_id,
      driver_id: booking.assigned_driver_id,
      customer_rating: rating,
      customer_review: reviewText,
    },
    update: {
      customer_rating: rating,
      customer_review: reviewText,
    },
  });

  const existingReview = await prisma.testimonials.findFirst({
    where: { booking_id: booking.id },
  });
  if (existingReview) {
    await prisma.testimonials.update({
      where: { id: existingReview.id },
      data: {
        rating,
        review: reviewText,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_id: booking.customer_id,
        approval_status: "pending",
        approved_at: null,
        approved_by_admin_id: null,
      },
    });
  } else {
    await prisma.testimonials.create({
      data: {
        booking_id: booking.id,
        customer_id: booking.customer_id,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        rating,
        review: reviewText,
        approval_status: "pending",
        is_featured: false,
      },
    });
  }

  if (booking.assigned_driver_id) {
    const agg = await prisma.tripRatings.aggregate({
      where: { driver_id: booking.assigned_driver_id, customer_rating: { not: null } },
      _avg: { customer_rating: true },
    });
    await prisma.drivers.update({
      where: { id: booking.assigned_driver_id },
      data: { rating_avg: agg._avg.customer_rating ?? 0 },
    });
  }

  return {
    id: String(row.id),
    rating,
    review: reviewText,
  };
}
