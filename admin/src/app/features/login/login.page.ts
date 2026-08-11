import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="login-hero">
      <div class="login-orb h-56 w-56 bg-indigo-500/30" style="left: 8%; top: 18%"></div>
      <div class="login-orb h-72 w-72 bg-sky-400/20" style="right: 10%; bottom: 12%; animation-delay: -2s"></div>
      <div class="login-orb h-40 w-40 bg-amber-400/25" style="left: 42%; top: 8%; animation-delay: -4s"></div>

      <div class="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <div class="hidden px-4 text-white lg:block">
          <p class="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Yaazh Cabs</p>
          <h1 class="mt-4 text-5xl font-semibold leading-tight tracking-tight">
            Operate every trip with a premium command center.
          </h1>
          <p class="mt-4 max-w-md text-base text-white/65">
            Bookings, fleet, fares, content, and support — wired to your live Yaazh API.
          </p>
          <div class="mt-8 grid grid-cols-3 gap-3">
            @for (stat of highlights; track stat.label) {
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p class="text-2xl font-semibold">{{ stat.value }}</p>
                <p class="mt-1 text-xs uppercase tracking-wide text-white/50">{{ stat.label }}</p>
              </div>
            }
          </div>
        </div>

        <div class="login-card mx-auto">
          <div class="mb-6 flex items-center gap-3">
            <div
              class="grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold"
              style="background: var(--ya-gradient)"
            >
              YZ
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-amber-300">Admin access</p>
              <h2 class="text-2xl font-semibold">Welcome back</h2>
            </div>
          </div>

          <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
            <div class="ya-field login-field">
              <label for="admin-email">Email</label>
              <div class="ya-field__icon">
                <mat-icon>mail</mat-icon>
                <input
                  id="admin-email"
                  type="email"
                  formControlName="email"
                  autocomplete="username"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div class="ya-field login-field">
              <label for="admin-password">Password</label>
              <div class="ya-field__icon">
                <mat-icon>lock</mat-icon>
                <input
                  id="admin-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  mat-icon-button
                  type="button"
                  class="!text-white/55"
                  (click)="showPassword.set(!showPassword())"
                >
                  <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>

            <div class="login-row">
              <label class="login-remember">
                <input type="checkbox" formControlName="remember" />
                <span>Remember me</span>
              </label>
              <span class="login-forgot">Forgot password via support</span>
            </div>

            @if (error()) {
              <p class="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{{ error() }}</p>
            }

            <button
              mat-flat-button
              type="submit"
              class="ya-btn-primary login-submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="22"></mat-spinner>
              } @else {
                Sign in to console
              }
            </button>
          </form>

          <p class="mt-5 text-center text-xs text-white/40">
            Local seed: admin&#64;yaazh.local / ChangeMe123!
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly highlights = [
    { label: 'Live ops', value: '24/7' },
    { label: 'API modules', value: '25+' },
    { label: 'Udumalpet', value: 'HQ' },
  ];

  readonly form = this.fb.nonNullable.group({
    email: ['admin@yaazh.local', [Validators.required, Validators.email]],
    password: ['ChangeMe123!', Validators.required],
    remember: [true],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Login failed');
      },
    });
  }
}
