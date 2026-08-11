const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") || "";

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
  driver: { name: string; phone: string } | null;
  vehicle: { name: string; registration: string | null } | null;
  status_history: Array<{
    old_status: string | null;
    new_status: string;
    note: string | null;
    changed_at: string;
  }>;
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

export function trackBooking(booking_reference: string, customer_phone: string) {
  return request<TrackedBooking>("/bookings/track", {
    method: "POST",
    body: JSON.stringify({ booking_reference, customer_phone }),
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
