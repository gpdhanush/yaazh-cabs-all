import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService, ApiResult } from './api.service';
import { Booking, BookingPayment, DashboardStats } from './api.types';

const ADMIN = '/api/v1/admin';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly api = inject(ApiService);

  dashboard(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>(`${ADMIN}/dashboard`).pipe(map((r) => r.data));
  }

  listBookings(query?: { page?: number; per_page?: number; status?: string }): Observable<ApiResult<Booking[]>> {
    return this.api.get<Booking[]>(`${ADMIN}/bookings`, query);
  }

  getBooking(id: string): Observable<Booking> {
    return this.api.get<Booking>(`${ADMIN}/bookings/${id}`).pipe(map((r) => r.data));
  }

  createBooking(body: Record<string, unknown>): Observable<Booking> {
    return this.api.post<Booking>(`${ADMIN}/bookings`, body).pipe(map((r) => r.data));
  }

  confirmBooking(id: string): Observable<Booking> {
    return this.api.post<Booking>(`${ADMIN}/bookings/${id}/confirm`).pipe(map((r) => r.data));
  }

  cancelBooking(id: string, reason?: string): Observable<Booking> {
    return this.api.post<Booking>(`${ADMIN}/bookings/${id}/cancel`, { reason }).pipe(map((r) => r.data));
  }

  assignDriver(id: string, body: { driver_id: string | number; vehicle_id?: string | number }) {
    return this.api.post<Booking>(`${ADMIN}/bookings/${id}/assign-driver`, body).pipe(map((r) => r.data));
  }

  getBookingPayment(id: string): Observable<BookingPayment> {
    return this.api.get<BookingPayment>(`${ADMIN}/bookings/${id}/payment`).pipe(map((r) => r.data));
  }

  recordBookingPayment(
    id: string,
    body: { amount: number; method?: string; note?: string | null; allow_overpay?: boolean },
  ) {
    return this.api
      .post<{
        payment_id: string;
        fare_due: number;
        amount_paid: number;
        balance_due: number;
        payment_status: string;
      }>(`${ADMIN}/bookings/${id}/payment`, body)
      .pipe(map((r) => r.data));
  }

  setBookingPaymentStatus(id: string, body: { payment_status: string; note?: string | null }) {
    return this.api.put<BookingPayment>(`${ADMIN}/bookings/${id}/payment-status`, body).pipe(map((r) => r.data));
  }

  list(path: string, query?: Record<string, string | number | undefined | null>) {
    return this.api.get<unknown[]>(`${ADMIN}${path}`, query);
  }

  get(path: string) {
    return this.api.get<unknown>(`${ADMIN}${path}`);
  }

  create(path: string, body: unknown) {
    return this.api.post<unknown>(`${ADMIN}${path}`, body);
  }

  upload(path: string, form: FormData) {
    return this.api.postFormData<{ url: string; path: string }>(`${ADMIN}${path}`, form);
  }

  update(path: string, body: unknown) {
    return this.api.put<unknown>(`${ADMIN}${path}`, body);
  }

  remove(path: string) {
    return this.api.delete<unknown>(`${ADMIN}${path}`);
  }

  action(path: string, body?: unknown) {
    return this.api.post<unknown>(`${ADMIN}${path}`, body);
  }
}
