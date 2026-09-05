import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { AdminRole, ApiError } from '../../core/api/api.types';

function phoneOptionalValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) return null;
  if (!/^\d{10}$/.test(raw)) return { phone: true };
  return null;
}

function matchPassword(control: AbstractControl): ValidationErrors | null {
  const parent = control.parent;
  if (!parent) return null;
  const password = String(parent.get('password')?.value ?? '');
  const confirm = String(control.value ?? '');
  if (!password && !confirm) return null;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-admin-user-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-wrap space-y-5">
      <div class="flex flex-wrap items-center gap-3">
        <a routerLink="/admin-users" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
          <mat-icon class="!text-base">arrow_back</mat-icon>
          Back to users
        </a>
      </div>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <img class="admin-user-form__logo" src="logo.png" alt="Yaazh Cabs" />
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit user' : 'Add staff user' }}</h2>
            <p class="page-subtitle">
              {{ isEdit() ? 'Update profile, role, or reset password.' : 'Create a console login and assign a role.' }}
            </p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="name">Full name <span class="ya-req">*</span></label>
              <input
                id="name"
                class="ya-input"
                [class.ya-input--error]="showError('name')"
                formControlName="name"
                placeholder="Enter full name"
              />
              @if (showError('name')) {
                <p class="ya-error">{{ errorText('name') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="email">Email <span class="ya-req">*</span></label>
              <input
                id="email"
                class="ya-input"
                [class.ya-input--error]="showError('email')"
                type="email"
                formControlName="email"
                placeholder="name@yaazh.in"
              />
              @if (showError('email')) {
                <p class="ya-error">{{ errorText('email') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="phone">Phone</label>
              <input
                id="phone"
                class="ya-input"
                [class.ya-input--error]="showError('phone')"
                type="tel"
                inputmode="numeric"
                maxlength="10"
                formControlName="phone"
                placeholder="10-digit mobile (optional)"
                (input)="onPhoneInput($event)"
              />
              @if (showError('phone')) {
                <p class="ya-error">{{ errorText('phone') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="role_id">Role <span class="ya-req">*</span></label>
              <select
                id="role_id"
                class="ya-input"
                [class.ya-input--error]="showError('role_id')"
                formControlName="role_id"
              >
                <option value="">Select role</option>
                @for (role of roles(); track role.id) {
                  <option [value]="role.id">{{ role.name }}</option>
                }
              </select>
              @if (showError('role_id')) {
                <p class="ya-error">{{ errorText('role_id') }}</p>
              }
              <p class="mt-1 text-xs text-slate-500">
                Need a new role or different access?
                <a routerLink="/roles" class="font-medium" [style.color]="'var(--ya-primary)'">Manage roles</a>
              </p>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="password">
                {{ isEdit() ? 'New password (optional)' : 'Password' }}
                @if (!isEdit()) {
                  <span class="ya-req">*</span>
                }
              </label>
              <input
                id="password"
                class="ya-input"
                [class.ya-input--error]="showError('password')"
                type="password"
                formControlName="password"
                [placeholder]="isEdit() ? 'Leave blank to keep current' : 'At least 8 characters'"
              />
              @if (showError('password')) {
                <p class="ya-error">{{ errorText('password') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="confirm_password">
                {{ isEdit() ? 'Confirm new password' : 'Confirm password' }}
                @if (!isEdit()) {
                  <span class="ya-req">*</span>
                }
              </label>
              <input
                id="confirm_password"
                class="ya-input"
                [class.ya-input--error]="showError('confirm_password')"
                type="password"
                formControlName="confirm_password"
                placeholder="Re-enter password"
              />
              @if (showError('confirm_password')) {
                <p class="ya-error">{{ errorText('confirm_password') }}</p>
              }
            </div>

            @if (isEdit()) {
              <div class="ya-field ya-field--stacked">
                <label class="ya-label" for="is_active">Active</label>
                <select id="is_active" class="ya-input" formControlName="is_active">
                  <option [ngValue]="true">Yes</option>
                  <option [ngValue]="false">No</option>
                </select>
              </div>
            }
          </div>

          @if (error()) {
            <p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
          }

          <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/admin-users">Cancel</a>
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create user' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AdminUserFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly roles = signal<AdminRole[]>([]);
  private userId: string | null = null;

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    phone: this.fb.nonNullable.control('', [phoneOptionalValidator]),
    role_id: this.fb.nonNullable.control('', [Validators.required]),
    password: this.fb.nonNullable.control(''),
    confirm_password: this.fb.nonNullable.control('', [matchPassword]),
    is_active: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    this.form.controls.password.valueChanges.subscribe(() => {
      this.form.controls.confirm_password.updateValueAndValidity({ emitEvent: false });
    });

    this.api.listAdminRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: (err: unknown) => this.error.set(this.permissionMessage(err)),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.userId = id;
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity();
      this.load(id);
    } else {
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.controls.password.updateValueAndValidity();
    }
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  onPhoneInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = el.value.replace(/\D/g, '').slice(0, 10);
    if (el.value !== digits) el.value = digits;
    this.form.controls.phone.setValue(digits, { emitEvent: false });
  }

  errorText(name: keyof typeof this.form.controls): string {
    const c = this.form.controls[name];
    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('minlength')) {
      const min = c.getError('minlength')?.requiredLength;
      return `Must be at least ${min} characters.`;
    }
    if (c.hasError('email')) return 'Enter a valid email address.';
    if (c.hasError('phone')) return 'Enter a valid 10-digit phone number.';
    if (c.hasError('mismatch')) return 'Passwords do not match.';
    return 'Invalid value.';
  }

  private permissionMessage(err: unknown): string {
    if (err instanceof ApiError && err.status === 403) {
      return 'Only Super Admin can manage users.';
    }
    return err instanceof Error ? err.message : 'Request failed.';
  }

  private load(id: string): void {
    this.api.getAdminUser(id).subscribe({
      next: (u) => {
        this.form.patchValue({
          name: u.name,
          email: u.email,
          phone: (u.phone ?? '').replace(/\D/g, '').slice(-10),
          role_id: u.role_id,
          password: '',
          confirm_password: '',
          is_active: u.is_active,
        });
      },
      error: (err: unknown) => this.error.set(this.permissionMessage(err)),
    });
  }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Please fix the highlighted required fields.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      phone: raw.phone.trim() || null,
      role_id: raw.role_id,
    };
    if (raw.password.trim()) body['password'] = raw.password;
    if (this.isEdit()) body['is_active'] = raw.is_active;

    const req$ = this.isEdit()
      ? this.api.updateAdminUser(this.userId!, body)
      : this.api.createAdminUser({ ...body, password: raw.password });

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'User updated' : 'User created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/admin-users');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(this.permissionMessage(err));
      },
    });
  }
}
