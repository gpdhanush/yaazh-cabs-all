import type { TrackedBooking } from "@/lib/api";

export type LocalBookingCache = {
  ref: string;
  phone: string;
  name: string;
  pickup: string;
  drop: string;
  createdAt: number;
};

const KEY = "yaazh.bookings.v1";

export function loadBookingCache(): LocalBookingCache[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        const r = row as Record<string, unknown>;
        const ref =
          typeof r["ref"] === "string"
            ? r["ref"]
            : typeof r["booking_reference"] === "string"
              ? r["booking_reference"]
              : "";
        const phoneRaw =
          typeof r["phone"] === "string"
            ? r["phone"]
            : typeof r["mobile"] === "string"
              ? r["mobile"]
              : typeof r["customer_phone"] === "string"
                ? r["customer_phone"]
                : "";
        if (!ref || !phoneRaw) return null;
        return {
          ref,
          phone: phoneRaw.replace(/\D/g, "").slice(-10),
          name:
            typeof r["name"] === "string"
              ? r["name"]
              : typeof r["customer_name"] === "string"
                ? r["customer_name"]
                : "",
          pickup:
            typeof r["pickup"] === "string"
              ? r["pickup"]
              : typeof r["pickup_location"] === "string"
                ? r["pickup_location"]
                : "",
          drop:
            typeof r["drop"] === "string"
              ? r["drop"]
              : typeof r["drop_location"] === "string"
                ? r["drop_location"]
                : "",
          createdAt: typeof r["createdAt"] === "number" ? r["createdAt"] : Date.now(),
        } satisfies LocalBookingCache;
      })
      .filter((x): x is LocalBookingCache => Boolean(x));
  } catch {
    return [];
  }
}

export function cacheBooking(b: LocalBookingCache) {
  if (typeof window === "undefined") return;
  const all = [b, ...loadBookingCache().filter((x) => x.ref !== b.ref)].slice(0, 30);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export type Stage = {
  key: string;
  title: string;
  body: string;
  done: boolean;
  at?: string | undefined;
};

const TIMELINE: Array<{ key: string; title: string; statuses: string[] }> = [
  { key: "received", title: "Request received", statuses: ["pending"] },
  {
    key: "confirmed",
    title: "Booking confirmed",
    statuses: ["confirmed", "driver_notified", "driver_accepted", "driver_rejected"],
  },
  {
    key: "driver",
    title: "Driver assigned",
    statuses: ["driver_assigned", "on_the_way", "arrived"],
  },
  {
    key: "trip",
    title: "Trip in progress",
    statuses: ["trip_started"],
  },
  {
    key: "done",
    title: "Trip completed",
    statuses: ["completed"],
  },
];

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  driver_notified: 1,
  driver_accepted: 1,
  driver_rejected: 1,
  driver_assigned: 2,
  on_the_way: 2,
  arrived: 2,
  trip_started: 3,
  completed: 4,
  cancelled: -1,
  rejected: -1,
  no_show: -1,
};

export function stagesFromTrack(booking: TrackedBooking): Stage[] {
  const status = booking.status;
  if (status === "cancelled" || status === "rejected" || status === "no_show") {
    return [
      {
        key: "received",
        title: "Request received",
        body: `Booking ${booking.booking_reference} was logged.`,
        done: true,
        at: formatAt(booking.status_history[0]?.changed_at),
      },
      {
        key: "closed",
        title: status === "cancelled" ? "Booking cancelled" : status === "rejected" ? "Booking rejected" : "No show",
        body: booking.status_history.at(-1)?.note || "This booking is no longer active.",
        done: true,
        at: formatAt(booking.status_history.at(-1)?.changed_at),
      },
    ];
  }

  const rank = STATUS_RANK[status] ?? 0;
  const historyByStatus = new Map(
    booking.status_history.map((h) => [h.new_status, h.changed_at] as const),
  );

  return TIMELINE.map((step, index) => {
    const done = rank >= index;
    const atIso = step.statuses.map((s) => historyByStatus.get(s)).find(Boolean);
    let body = "";
    if (step.key === "received") body = `Booking ${booking.booking_reference} logged with our desk.`;
    else if (step.key === "confirmed") body = "Our team verified the route and fare.";
    else if (step.key === "driver") {
      body = booking.driver
        ? `${booking.driver.name}${booking.vehicle?.registration ? ` · ${booking.vehicle.registration}` : ""}`
        : "Waiting for driver assignment.";
    } else if (step.key === "trip") body = "Enjoy your ride with Yaazh Cabs.";
    else body = "Thanks for travelling with us.";

    return {
      key: step.key,
      title: step.title,
      body,
      done,
      at: done ? formatAt(atIso) : undefined,
    };
  });
}

function formatAt(iso?: string) {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return undefined;
  }
}

export function isActiveTripStatus(status: string) {
  return !["completed", "cancelled", "rejected", "no_show"].includes(status);
}

export function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Awaiting confirmation";
    case "confirmed":
      return "Confirmed";
    case "driver_notified":
      return "Finding driver";
    case "driver_assigned":
      return "Driver assigned";
    case "on_the_way":
      return "Driver on the way";
    case "arrived":
      return "Driver arrived";
    case "trip_started":
      return "Trip started";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Rejected";
    default:
      return status.replace(/_/g, " ");
  }
}
