import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api/api.service';
import { ApiError } from '../../core/api/api.types';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="login-hero">
      <div class="login-stage login-stage--single">
        <div class="login-card">
          <div class="login-card__head">
            <img class="login-brand-mark" src="app-logo.png" alt="Yaazh Cabs" />
            <div>
              <p class="login-copy__eyebrow">Admin access</p>
              <h2>Reset password</h2>
            </div>
          </div>
          <p class="login-card__hint">{{ token() ? 'Choose a new password for your admin account.' : 'Enter your admin email to receive a reset link.' }}</p>
          <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
            @if (!token()) {
              <div class="ya-field login-field">
              <label for="reset-email">Email</label>
              <input id="reset-email" type="email" formControlName="email" (input)="lowercaseEmail($event)" autocomplete="username" placeholder="admin@example.com" />
              </div>
            }
            @if (token()) {
              <div class="ya-field login-field">
              <label for="reset-password">New password</label>
              <div class="login-input-wrap"><input id="reset-password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" placeholder="At least 8 characters" /><button mat-icon-button type="button" aria-label="Show password" (click)="showPassword.set(!showPassword())"><mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon></button></div>
              </div>
            }
            @if (error()) { <p class="login-error">{{ error() }}</p> }
            @if (success()) { <p class="login-success">{{ success() }}</p> }
            <button mat-flat-button type="submit" class="ya-btn-primary login-submit" [disabled]="form.invalid || loading()">
              @if (loading()) { <mat-spinner diameter="22"></mat-spinner> } @else { {{ token() ? 'Set new password' : 'Email reset link' }} }
            </button>
          </form>
          <a routerLink="/login" class="login-back-link">Back to sign in</a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly token = signal('');
  readonly showPassword = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token') || '');
    if (this.token()) this.form.controls.email.clearValidators();
    this.form.controls.email.updateValueAndValidity();
    if (!this.token()) this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    const { email, password } = this.form.getRawValue();
    const request = this.token()
      ? this.api.post('/api/v1/auth/admin/complete-reset-password', { token: this.token(), new_password: password })
      : this.api.post('/api/v1/auth/admin/reset-password', { email });
    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(this.token() ? 'Password reset. You can sign in now.' : 'Check your email for a password reset link.');
        if (this.token()) this.form.reset();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(err instanceof ApiError ? err.message : 'Password reset failed.');
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
