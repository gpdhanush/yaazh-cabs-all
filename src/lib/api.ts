const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") || "";

function durableMediaUrl(value: string, apiOrigin: string): string | null {
  if (!apiOrigin) return null;
  let pathname = value;
  let search = "";
  try {
    const u = new URL(value);
    pathname = u.pathname;
    search = u.search;
  } catch {
    const q = value.indexOf("?");
    if (q >= 0) {
      pathname = value.slice(0, q);
      search = value.slice(q);
    }
  }
  const invoice = pathname.match(/\/(?:storage\/public\/invoices|api\/v1\/public\/invoices)\/([^/]+)/i);
  if (invoice) return `${apiOrigin}/api/v1/public/invoices/${invoice[1]}${search}`;
  const stored = pathname.match(/\/storage\/public\/(.+)/i);
  if (stored) return `${apiOrigin}/api/v1/public/media/${stored[1]}${search}`;
  return null;
}

export function mediaUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value === "null") return null;

  const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/i, "").replace(/\/$/, "");
  const durable = durableMediaUrl(value, apiOrigin);
  if (durable) return durable;

  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const host = u.hostname.toLowerCase();
      const rewriteHost =
        ["localhost", "127.0.0.1", "10.0.2.2"].includes(host) ||
        host.endsWith(".vercel.app");
      if (rewriteHost && apiOrigin) {
        return `${apiOrigin}${u.pathname}${u.search}`;
      }
    } catch {
      /* keep */
    }
    return value;
  }
  if (!apiOrigin) return value;
  if (value.startsWith("/")) return `${apiOrigin}${value}`;
  return `${apiOrigin}/${value}`;
}

export class ApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(message: string, status = 400, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) {
    throw new ApiError("API URL is not configured (VITE_API_URL).", 503);
  }

  const res = await fetch(`${API_BASE}/api/v1/public${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.success === false) {
    throw new ApiError(body?.message || `Request failed (${res.status})`, res.status, body?.errors);
  }

  return body?.data as T;
}

export type VehicleCategory = {
  id: string;
  name: string;
  slug: string;
  seating_capacity: number;
  luggage_capacity: string | null;
  description?: string | null;
  image_url?: string | null;
  one_way_rate_per_km: number;
  round_trip_rate_per_km: number;
  driver_batta: number;
};

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  related_type: string | null;
};

export type PublicTestimonial = {
  id: string;
  customer_name: string;
  rating: number;
  review: string;
  is_featured: boolean;
};

export type PublicRoute = {
  id: string;
  slug: string;
  title: string;
  from: string | null;
  to: string | null;
  distance_km: number;
  duration_minutes: number | null;
  is_popular: boolean;
  amount?: number | null;
  starting_fare: number | null;
  image_url?: string | null;
  tag: string | null;
};

export type PublicCity = {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  is_airport: boolean;
};

export type PublicGalleryImage = {
  id: string;
  image_url: string;
  caption: string | null;
};

export type PublicGalleryGroup = {
  id: string;
  slug: string;
  title: string;
  group_type: string;
  images: PublicGalleryImage[];
};

export type AppConfig = {
  settings: Record<string, string | null>;
  remote_config: Record<string, string | null>;
};

export type TripTypeApi = "one_way" | "round_trip" | "airport" | "outstation" | "local_rental";

export type FareEstimate = {
  vehicle_category_id: string;
  route_id: string | null;
  distance_km: number;
  duration_minutes: number | null;
  provider: string | null;
  rate_per_km: number;
  base_fare: number;
  driver_batta: number;
  minimum_fare: number;
  distance_fare: number;
  gst_percentage: number;
  gst_amount: number;
  discount_amount: number;
  subtotal: number;
  estimated_total: number;
};

export type CreatedBooking = {
  id: string;
  booking_reference: string;
  status: string;
  trip_type: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  drop_location: string;
  pickup_at: string;
  estimated_total: string;
  final_total: string | null;
  assigned_driver_id: string | null;
};

export type TrackedBooking = {
  id: string;
  booking_reference: string;
  status: string;
  trip_type: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  drop_location: string;
  pickup_at: string;
  estimated_total: string;
  final_total: string | null;
  estimated_distance_km: number | null;
  driver: { id?: string; name: string; phone: string; photo_url?: string | null } | null;
  vehicle: { name: string; registration: string | null } | null;
  status_history: Array<{
    old_status: string | null;
    new_status: string;
    note: string | null;
    changed_at: string;
  }>;
};

export type BookingTrackSummary = {
  id: string;
  booking_reference: string;
  status: string;
  trip_type: string;
  customer_name: string;
  pickup_location: string;
  drop_location: string;
  pickup_at: string;
};

export type TrackDetailResponse = { mode: "detail"; booking: TrackedBooking };
export type TrackListResponse = { mode: "list"; bookings: BookingTrackSummary[] };
export type TrackResponse = TrackDetailResponse | TrackListResponse;

export type TrackBookingInput = {
  booking_reference?: string;
  customer_phone?: string;
};

export type CreateBookingPayload = {
  vehicle_category_id: string;
  trip_type: TripTypeApi;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  pickup_location: string;
  drop_location: string;
  pickup_city?: string | null;
  drop_city?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  drop_latitude?: number | null;
  drop_longitude?: number | null;
  pickup_at: string;
  return_at?: string | null;
  passenger_count?: number | null;
  special_note?: string | null;
  coupon_code?: string | null;
};

export type FareEstimatePayload = {
  vehicle_category_id: string;
  trip_type: TripTypeApi;
  route_id?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  drop_latitude?: number | null;
  drop_longitude?: number | null;
  distance_km?: number | null;
  coupon_code?: string | null;
};

export function isApiConfigured() {
  return Boolean(API_BASE);
}

export function getVehicleCategories() {
  return request<VehicleCategory[]>("/vehicle-categories");
}

export function getGallery() {
  return request<PublicGalleryGroup[]>("/gallery");
}

export function getFaqs() {
  return request<PublicFaq[]>("/faqs");
}

export function getTestimonials() {
  return request<PublicTestimonial[]>("/testimonials");
}

export function getRoutes(opts?: { popular?: boolean; page?: number; perPage?: number }) {
  const params = new URLSearchParams();
  if (opts?.popular) params.set("popular", "1");
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.perPage) params.set("per_page", String(opts.perPage ?? 50));
  else params.set("per_page", "50");
  const qs = params.toString();
  return request<PublicRoute[]>(`/routes${qs ? `?${qs}` : ""}`);
}

export function getCities(opts?: { page?: number; perPage?: number }) {
  const params = new URLSearchParams();
  params.set("page", String(opts?.page ?? 1));
  params.set("per_page", String(opts?.perPage ?? 100));
  return request<PublicCity[]>(`/cities?${params.toString()}`);
}

export function getAppConfig() {
  return request<AppConfig>("/app-config?app=user_website&platform=web");
}

export function submitContact(payload: {
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message: string;
}) {
  return request<{ id: string }>("/contact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function estimateFare(payload: FareEstimatePayload) {
  return request<FareEstimate>("/fare/estimate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createBooking(payload: CreateBookingPayload) {
  return request<CreatedBooking>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function isTrackedBooking(value: unknown): value is TrackedBooking {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.booking_reference === "string";
}

/** Accepts new `{ mode, booking|bookings }` and legacy flat booking payloads from older APIs. */
export function normalizeTrackResponse(data: unknown): TrackResponse {
  if (!data || typeof data !== "object") {
    throw new ApiError("Unexpected tracking response.", 502);
  }
  const d = data as Record<string, unknown>;
  if (d.mode === "list" && Array.isArray(d.bookings)) {
    return { mode: "list", bookings: d.bookings as BookingTrackSummary[] };
  }
  if (d.mode === "detail" && isTrackedBooking(d.booking)) {
    return { mode: "detail", booking: d.booking };
  }
  if (isTrackedBooking(data)) {
    return { mode: "detail", booking: data };
  }
  throw new ApiError("Unexpected tracking response.", 502);
}

export async function trackBooking(input: TrackBookingInput): Promise<TrackResponse> {
  const body: TrackBookingInput = {};
  const ref = input.booking_reference?.trim();
  const phone = input.customer_phone?.replace(/\D/g, "");
  if (ref) body.booking_reference = ref;
  if (phone) body.customer_phone = phone;
  const raw = await request<unknown>("/bookings/track", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeTrackResponse(raw);
}

export type PublicFeedback = {
  booking_reference: string;
  status: string;
  trip_type: string;
  customer_name: string;
  pickup_location: string;
  drop_location: string;
  pickup_at: string;
  completed_at: string | null;
  estimated_total: number;
  final_total: number | null;
  can_submit: boolean;
  already_submitted: boolean;
  submitted_rating: number | null;
  submitted_review: string | null;
  driver: { id?: string; name: string; phone: string; photo_url?: string | null } | null;
  vehicle: { name: string; registration: string | null } | null;
};

export function getPublicFeedback(token: string) {
  return request<PublicFeedback>(`/feedback/${encodeURIComponent(token)}`);
}

export function submitPublicFeedback(token: string, payload: { rating: number; review?: string }) {
  return request<{ id: string; rating: number; review: string }>(`/feedback/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Map UI trip labels to API enum. */
export function toApiTripType(label: string): TripTypeApi {
  switch (label) {
    case "Round Trip":
      return "round_trip";
    case "Local Rental":
      return "local_rental";
    case "Airport Transfer":
      return "airport";
    case "Tour Package":
      return "outstation";
    default:
      return "one_way";
  }
}

export function formatTripType(api: string): string {
  switch (api) {
    case "round_trip":
      return "Round Trip";
    case "local_rental":
      return "Local Rental";
    case "airport":
      return "Airport Transfer";
    case "outstation":
      return "Tour Package";
    default:
      return "One Way";
  }
}
