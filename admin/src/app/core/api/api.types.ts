export type ApiMeta = {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
};

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: ApiMeta | null;
  errors?: unknown;
  request_id?: string | null;
};

export class ApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(message: string, status = 400, errors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role_id?: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: AdminUser;
};

export type BookingDriver = {
  id: string;
  name: string;
  phone: string;
};

export type BookingVehicle = {
  id: string;
  name: string;
  registration: string | null;
};

export type BookingPayment = {
  booking_id: string;
  booking_reference: string;
  payment_status: string;
  fare_due: number;
  estimated_total: number;
  final_total: number | null;
  amount_paid: number;
  balance_due: number;
  currency: string;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    payment_type: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;
};

export type Booking = {
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
  estimated_distance_km?: number | null;
  start_odometer_km?: number | null;
  end_odometer_km?: number | null;
  actual_distance_km?: number | null;
  odometer_difference_km?: number | null;
  created_at?: string;
  confirmed_at?: string | null;
  completed_at?: string | null;
  driver?: BookingDriver | null;
  vehicle?: BookingVehicle | null;
  payment?: BookingPayment | null;
  history?: Array<{
    old_status: string | null;
    new_status: string;
    note: string | null;
    changed_at: string;
  }>;
};

export type LiveTrackingTrip = {
  id: string;
  booking_reference: string;
  status: string;
  customer_name: string;
  pickup_location: string;
  drop_location: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  drop_latitude: number | null;
  drop_longitude: number | null;
  progress: number;
  eta_min: number | null;
  driver: { id: string; name: string; phone: string } | null;
  vehicle: { name: string; registration: string | null } | null;
  location: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed_kmph: number | null;
    recorded_at: string | null;
    stale: boolean;
  } | null;
};

export type DashboardStats = {
  total_bookings: number;
  pending_bookings: number;
  active_drivers: number;
  customers: number;
  bookings_today: number;
  enquiries?: number;
};

export type ReportPeriod = 'day' | 'week' | 'month';

export type ReportSeriesPoint = {
  key: string;
  label: string;
  bookings: number;
  completed: number;
  cancelled: number;
  pending: number;
  revenue: number;
};

export type ReportsPayload = {
  period: ReportPeriod;
  from?: string;
  to?: string;
  counts: {
    bookings: number;
    completed: number;
    cancelled: number;
    pending: number;
    revenue: number;
  };
  series: ReportSeriesPoint[];
  bookings_by_status: Array<{ status: string; count: number }>;
};
