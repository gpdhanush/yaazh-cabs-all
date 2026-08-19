import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService, ApiResult } from './api.service';
import {
  AdminPermission,
  AdminRole,
  AdminStaffUser,
  AuditLog,
  Booking,
  BookingInvoice,
  BookingPayment,
  DashboardStats,
  LiveTrackingTrip,
} from './api.types';

const ADMIN = '/api/v1/admin';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly api = inject(ApiService);

  dashboard(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>(`${ADMIN}/dashboard`).pipe(map((r) => r.data));
  }

  liveTracking(): Observable<LiveTrackingTrip[]> {
    return this.api.get<LiveTrackingTrip[]>(`${ADMIN}/live-tracking`).pipe(map((r) => r.data));
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

  rejectBooking(id: string, reason?: string): Observable<Booking> {
    return this.api.post<Booking>(`${ADMIN}/bookings/${id}/reject`, { reason }).pipe(map((r) => r.data));
  }

  cancelBooking(id: string, reason?: string): Observable<Booking> {
    return this.api.post<Booking>(`${ADMIN}/bookings/${id}/cancel`, { reason }).pipe(map((r) => r.data));
  }

  resendBookingInvoice(id: string, email?: string): Observable<BookingInvoice> {
    return this.api
      .post<BookingInvoice>(`${ADMIN}/bookings/${id}/invoice/resend`, email ? { email } : {})
      .pipe(map((r) => r.data));
  }

  downloadBookingInvoice(id: string) {
    return this.api.getBlob(`${ADMIN}/bookings/${id}/invoice/pdf`);
  }

  assignDriver(id: string, body: { driver_id: string | number; vehicle_id?: string | number }) {
    return this.api.post<Booking>(`${ADMIN}/bookings/${id}/assign-driver`, body).pipe(map((r) => r.data));
  }

  registerDevice(body: { platform: 'web' | 'android' | 'ios'; fcm_token: string; app_version?: string }) {
    return this.api.post<{ id: string }>(`${ADMIN}/devices`, body).pipe(map((r) => r.data));
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

  uploadDriverPhoto(id: string, form: FormData) {
    return this.api
      .postFormData<{ photo_url?: string | null; profile_image_url?: string | null }>(
        `${ADMIN}/drivers/${id}/photo`,
        form,
      )
      .pipe(map((r) => r.data));
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

  listAdminRoles(query?: { all?: string }): Observable<AdminRole[]> {
    return this.api.get<AdminRole[]>(`${ADMIN}/admin-roles`, query).pipe(map((r) => r.data));
  }

  getAdminRole(id: string): Observable<AdminRole> {
    return this.api.get<AdminRole>(`${ADMIN}/admin-roles/${id}`).pipe(map((r) => r.data));
  }

  createAdminRole(body: Record<string, unknown>): Observable<AdminRole> {
    return this.api.post<AdminRole>(`${ADMIN}/admin-roles`, body).pipe(map((r) => r.data));
  }

  updateAdminRole(id: string, body: Record<string, unknown>): Observable<AdminRole> {
    return this.api.put<AdminRole>(`${ADMIN}/admin-roles/${id}`, body).pipe(map((r) => r.data));
  }

  activateAdminRole(id: string): Observable<AdminRole> {
    return this.api.post<AdminRole>(`${ADMIN}/admin-roles/${id}/activate`).pipe(map((r) => r.data));
  }

  deactivateAdminRole(id: string): Observable<AdminRole> {
    return this.api.post<AdminRole>(`${ADMIN}/admin-roles/${id}/deactivate`).pipe(map((r) => r.data));
  }

  listPermissions(): Observable<AdminPermission[]> {
    return this.api.get<AdminPermission[]>(`${ADMIN}/permissions`).pipe(map((r) => r.data));
  }

  listAdminUsers(query?: { page?: number; per_page?: number; q?: string }): Observable<ApiResult<AdminStaffUser[]>> {
    return this.api.get<AdminStaffUser[]>(`${ADMIN}/admin-users`, query);
  }

  getAdminUser(id: string): Observable<AdminStaffUser> {
    return this.api.get<AdminStaffUser>(`${ADMIN}/admin-users/${id}`).pipe(map((r) => r.data));
  }

  createAdminUser(body: Record<string, unknown>): Observable<AdminStaffUser> {
    return this.api.post<AdminStaffUser>(`${ADMIN}/admin-users`, body).pipe(map((r) => r.data));
  }

  updateAdminUser(id: string, body: Record<string, unknown>): Observable<AdminStaffUser> {
    return this.api.put<AdminStaffUser>(`${ADMIN}/admin-users/${id}`, body).pipe(map((r) => r.data));
  }

  activateAdminUser(id: string): Observable<AdminStaffUser> {
    return this.api.post<AdminStaffUser>(`${ADMIN}/admin-users/${id}/activate`).pipe(map((r) => r.data));
  }

  deactivateAdminUser(id: string): Observable<AdminStaffUser> {
    return this.api.post<AdminStaffUser>(`${ADMIN}/admin-users/${id}/deactivate`).pipe(map((r) => r.data));
  }

  listAuditLogs(query?: {
    page?: number;
    per_page?: number;
    q?: string;
    action?: string;
    entity_type?: string;
  }): Observable<ApiResult<AuditLog[]>> {
    return this.api.get<AuditLog[]>(`${ADMIN}/audit-logs`, query);
  }

  getAuditLog(id: string): Observable<AuditLog> {
    return this.api.get<AuditLog>(`${ADMIN}/audit-logs/${id}`).pipe(map((r) => r.data));
  }
}
