import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope, ApiError, ApiMeta } from './api.types';

export type ApiResult<T> = { data: T; meta?: ApiMeta | null; message?: string };

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl.replace(/\/$/, '');

  get<T>(path: string, query?: Record<string, string | number | undefined | null>): Observable<ApiResult<T>> {
    let params = new HttpParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== '') params = params.set(k, String(v));
      }
    }
    return this.http
      .get<ApiEnvelope<T>>(`${this.base}${path}`, { params })
      .pipe(
        map((body) => this.unwrap(body)),
        catchError((err) => this.handleError(err)),
      );
  }

  post<T>(path: string, body?: unknown): Observable<ApiResult<T>> {
    return this.http
      .post<ApiEnvelope<T>>(`${this.base}${path}`, body ?? {})
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.handleError(err)),
      );
  }

  postFormData<T>(path: string, form: FormData): Observable<ApiResult<T>> {
    return this.http
      .post<ApiEnvelope<T>>(`${this.base}${path}`, form)
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.handleError(err)),
      );
  }

  put<T>(path: string, body?: unknown): Observable<ApiResult<T>> {
    return this.http
      .put<ApiEnvelope<T>>(`${this.base}${path}`, body ?? {})
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.handleError(err)),
      );
  }

  delete<T>(path: string): Observable<ApiResult<T>> {
    return this.http
      .delete<ApiEnvelope<T>>(`${this.base}${path}`)
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.handleError(err)),
      );
  }

  private unwrap<T>(body: ApiEnvelope<T>): ApiResult<T> {
    if (!body || body.success === false) {
      throw new ApiError(body?.message || 'Request failed', 400, body?.errors);
    }
    return { data: body.data as T, meta: body.meta, message: body.message };
  }

  private handleError(err: unknown) {
    if (err instanceof ApiError) return throwError(() => err);
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiEnvelope<unknown> | { message?: string } | null;
      const message =
        (body && 'message' in body && body.message) ||
        err.message ||
        `Request failed (${err.status})`;
      return throwError(() => new ApiError(String(message), err.status, (body as ApiEnvelope<unknown>)?.errors));
    }
    return throwError(() => err);
  }
}
