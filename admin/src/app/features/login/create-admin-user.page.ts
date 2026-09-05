import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api/api.service';
import { ApiError } from '../../core/api/api.types';

@Component({
  selector: 'app-create-admin-user-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="login-hero">
      <div class="login-stage login-stage--single">
        <div class="login-card">
          <div class="login-card__head">
            <img class="login-brand-mark" src="app-logo.png" alt="Yaazh Cabs" />
            <div>
              <p class="login-copy__eyebrow">Initial setup</p>
              <h2>Create admin user</h2>
            </div>
          </div>
          <p class="login-card__hint">Use the private bootstrap key configured on the API server.</p>
          <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
            <div class="ya-field login-field"><label for="bootstrap-key">Bootstrap key</label><div class="login-input-wrap"><input id="bootstrap-key" [type]="showBootstrapKey() ? 'text' : 'password'" formControlName="bootstrap_key" autocomplete="off" /><button mat-icon-button type="button" aria-label="Show bootstrap key" (click)="showBootstrapKey.set(!showBootstrapKey())"><mat-icon>{{ showBootstrapKey() ? 'visibility_off' : 'visibility' }}</mat-icon></button></div></div>
            <div class="ya-field login-field"><label for="new-admin-name">Name</label><input id="new-admin-name" type="text" formControlName="name" autocomplete="name" /></div>
            <div class="ya-field login-field"><label for="new-admin-email">Email</label><input id="new-admin-email" type="email" formControlName="email" (input)="lowercaseEmail($event)" autocomplete="username" /></div>
            <div class="ya-field login-field"><label for="new-admin-password">Password</label><div class="login-input-wrap"><input id="new-admin-password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" /><button mat-icon-button type="button" aria-label="Show password" (click)="showPassword.set(!showPassword())"><mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon></button></div></div>
            @if (error()) { <p class="login-error">{{ error() }}</p> }
            @if (success()) { <p class="login-success">{{ success() }}</p> }
            <button mat-flat-button type="submit" class="ya-btn-primary login-submit" [disabled]="form.invalid || loading()">
              @if (loading()) { <mat-spinner diameter="22"></mat-spinner> } @else { Create user }
            </button>
          </form>
          <a routerLink="/login" class="login-back-link">Back to sign in</a>
        </div>
      </div>
    </div>
  `,
})
export class CreateAdminUserPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showBootstrapKey = signal(false);
  readonly showPassword = signal(false);
  readonly form = this.fb.nonNullable.group({
    bootstrap_key: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    const { bootstrap_key, name, email, password } = this.form.getRawValue();
    this.api.post('/api/v1/auth/admin/bootstrap', { name, email, password }, { headers: { 'x-admin-bootstrap-key': bootstrap_key } }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Admin user created. You can sign in now.');
        this.form.reset();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(err instanceof ApiError ? err.message : 'Could not create admin user.');
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
