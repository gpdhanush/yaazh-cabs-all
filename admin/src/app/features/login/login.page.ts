import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="login-hero">
      <div class="login-orb login-orb--a"></div>
      <div class="login-orb login-orb--b"></div>
      <div class="login-orb login-orb--c"></div>

      <div class="login-stage">
        <div class="login-copy">
          <div class="login-side-logo-wrap">
            <img class="login-side-logo login-side-logo--dark" src="logo.png" alt="Yaazh Cabs" />
            <!-- <img class="login-side-logo login-side-logo--dark" src="logo-light.png" alt="Yaazh Cabs" /> -->
          </div>
          <p class="login-copy__eyebrow">Yaazh Cabs</p>
          <h1>Operate every trip with a premium command center.</h1>
          <p class="login-copy__lead">
            Bookings, fleet, fares, content, and support — wired to your live Yaazh API.
          </p>
          <div class="login-stats">
            @for (stat of highlights; track stat.label) {
              <div class="login-stat">
                <p class="login-stat__value">{{ stat.value }}</p>
                <p class="login-stat__label">{{ stat.label }}</p>
              </div>
            }
          </div>
        </div>

        <div class="login-card">
          <div class="login-card__head">
            <img class="login-brand-mark" src="app-logo.png" alt="Yaazh Cabs" />
            <div>
              <p class="login-copy__eyebrow">Admin access</p>
              <h2>Welcome back</h2>
            </div>
          </div>

          <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
            <div class="ya-field login-field">
              <label for="admin-email">Email</label>
              <div class="ya-field__icon">
                <mat-icon>mail</mat-icon>
                <input
                  id="admin-email"
                  type="email"
                  formControlName="email"
                  (input)="lowercaseEmail($event)"
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
              <a routerLink="/forgot-password" class="login-forgot">Forgot password?</a>
            </div>

            @if (error()) {
              <p class="login-error">{{ error() }}</p>
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
          <div class="login-card__footer">
            <span>New administrator?</span>
            <a routerLink="/create-admin-user">Create user</a>
          </div>
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
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
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

  lowercaseEmail(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toLowerCase();
    if (input.value !== value) input.value = value;
    this.form.controls.email.setValue(value, { emitEvent: false });
  }
}
