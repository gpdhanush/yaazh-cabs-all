import type { BookingStatus } from "@prisma/client";
import { AppError } from "../errors/app-error.js";

const transitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled", "rejected"],
  /** Admin may hard-assign (skip offer) → driver_assigned, or send offer → driver_notified. */
  confirmed: ["driver_notified", "driver_assigned", "cancelled", "rejected"],
  driver_notified: ["driver_accepted", "driver_rejected", "driver_assigned", "cancelled"],
  driver_accepted: ["driver_assigned", "cancelled"],
  driver_rejected: ["driver_notified", "driver_assigned", "cancelled", "rejected"],
  driver_assigned: ["on_the_way", "cancelled", "no_show"],
  on_the_way: ["arrived", "cancelled", "no_show"],
  arrived: ["trip_started", "cancelled", "no_show"],
  trip_started: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  const allowed = transitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(409, `Invalid booking status transition: ${from} → ${to}.`);
  }
}

export function canCancel(status: BookingStatus): boolean {
  return (transitions[status] ?? []).includes("cancelled");
}

export { transitions as bookingTransitions };
