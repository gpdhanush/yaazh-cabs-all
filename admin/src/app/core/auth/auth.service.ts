import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AdminUser, AuthTokens } from '../api/api.types';
import { FirebaseService } from '../firebase/firebase.service';

const STORAGE_KEY = 'yaazh.admin.tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly firebase = inject(FirebaseService);

  private readonly tokensSignal = signal<AuthTokens | null>(this.readStorage());
  readonly tokens = this.tokensSignal.asReadonly();
  readonly user = computed(() => this.tokensSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.tokensSignal()?.access_token));

  login(email: string, password: string): Observable<AuthTokens> {
    return this.api.post<AuthTokens>('/api/v1/auth/admin/login', { email, password }).pipe(
      map((r) => r.data),
      tap((data) => {
        this.persist(data);
        void this.firebase.start();
      }),
    );
  }

  refresh(): Observable<AuthTokens> {
    const refresh = this.tokensSignal()?.refresh_token;
    if (!refresh) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.api.post<AuthTokens>('/api/v1/auth/admin/refresh', { refresh_token: refresh }).pipe(
      map((r) => r.data),
      tap((data) => {
        const prev = this.tokensSignal();
        this.persist({
          ...data,
          user: data.user ?? prev?.user,
        });
      }),
      catchError((err) => {
        this.clear();
        return throwError(() => err);
      }),
    );
  }

  logout(): void {
    const refresh = this.tokensSignal()?.refresh_token;
    if (refresh) {
      this.api.post('/api/v1/auth/admin/logout', { refresh_token: refresh }).subscribe({
        error: () => undefined,
      });
    }
    void this.firebase.stop();
    this.clear();
    void this.router.navigateByUrl('/login');
  }

  accessToken(): string | null {
    return this.tokensSignal()?.access_token ?? null;
  }

  setUser(user: AdminUser): void {
    const current = this.tokensSignal();
    if (!current) return;
    this.persist({ ...current, user });
  }

  private persist(tokens: AuthTokens): void {
    this.tokensSignal.set(tokens);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }

  private clear(): void {
    this.tokensSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private readStorage(): AuthTokens | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  }
}
