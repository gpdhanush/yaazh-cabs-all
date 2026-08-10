import { drivers } from "./site-data";

export type Booking = {
  ref: string;
  name: string;
  mobile: string;
  pickup: string;
  drop: string;
  date: string;
  time: string;
  vehicle: string;
  perKm: number;
  trip: string;
  estimate: number;
  createdAt: number;
};

const KEY = "yaazh.bookings.v1";

export function loadBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Booking[]) : [];
  } catch {
    return [];
  }
}

export function saveBooking(b: Booking) {
  if (typeof window === "undefined") return;
  const all = [b, ...loadBookings()].slice(0, 30);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function findBooking(query: string): Booking | undefined {
  const q = query.trim().toLowerCase().replace(/\s/g, "");
  if (!q) return undefined;
  return loadBookings().find(
    (b) => b.ref.toLowerCase() === q || b.mobile.replace(/\s/g, "") === q,
  );
}

export function makeRef() {
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `YC${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${n}`;
}

export type Stage = {
  key: string;
  title: string;
  body: string;
  done: boolean;
  at?: string | undefined;
};

export function driverFor(b: Booking) {
  let sum = 0;
  for (const ch of b.ref) sum += ch.charCodeAt(0);
  return drivers[sum % drivers.length]!;
}

/** Progress is time-based: each stage clears a few minutes after the booking. */
export function stagesFor(b: Booking): Stage[] {
  const mins = (Date.now() - b.createdAt) / 60000;
  const at = (offset: number) =>
    new Date(b.createdAt + offset * 60000).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const d = driverFor(b);
  const steps: { key: string; title: string; body: string; after: number }[] = [
    { key: "received", title: "Request received", body: `Booking ${b.ref} logged with our desk.`, after: 0 },
    { key: "confirmed", title: "Booking confirmed", body: "Our team verified the route and fare.", after: 2 },
    { key: "driver", title: "Driver assigned", body: `${d.name} · ${d.car} · ${d.phone}`, after: 5 },
    { key: "pickup", title: "Pickup scheduled", body: `Reporting at ${b.pickup} on ${b.date}, ${b.time}.`, after: 8 },
  ];
  return steps.map((s) => ({
    key: s.key,
    title: s.title,
    body: s.body,
    done: mins >= s.after,
    at: mins >= s.after ? at(s.after) : undefined,
  }));
}
