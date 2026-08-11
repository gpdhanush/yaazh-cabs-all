import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { driverPhotoUrl, mediaUrl } from '../../core/api/media-url';
import { YaDatepickerComponent } from '../../shared/ya-datepicker.component';

type FieldOpt = { label: string; value: string | boolean };

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) return { required: true };
  if (!/^\d{10}$/.test(raw)) return { phone: true };
  return null;
}

@Component({
  selector: 'app-driver-form-page',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    YaDatepickerComponent,
  ],
  template: `
    <div class="page-wrap space-y-5">
      <div class="flex flex-wrap items-center gap-3">
        <a routerLink="/drivers" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
          <mat-icon class="!text-base">arrow_back</mat-icon>
          Back to drivers
        </a>
      </div>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit driver' : 'Add new driver' }}</h2>
            <p class="page-subtitle">
              {{ isEdit() ? 'Update driver profile and status.' : 'Create a driver account for the Yaazh fleet.' }}
            </p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          @if (isEdit()) {
            <div class="ya-upload" [class.ya-upload--filled]="!!photoPreview()">
              <div class="ya-upload__preview">
                @if (photoPreview()) {
                  <img [src]="photoPreview()!" alt="Driver photo" />
                } @else {
                  <div class="ya-upload__placeholder">
                    <mat-icon>person</mat-icon>
                  </div>
                }
              </div>
              <div class="ya-upload__body">
                <p class="ya-upload__title">Profile photo</p>
                <p class="ya-upload__hint">Shown next to the driver name in admin and the customer app.</p>
                <div class="ya-upload__actions">
                  <label class="ya-upload__btn">
                    <mat-icon>photo_camera</mat-icon>
                    {{ photoPreview() ? 'Change photo' : 'Upload photo' }}
                    <input type="file" accept="image/*" hidden (change)="onPhotoPicked($event)" />
                  </label>
                </div>
                @if (uploading()) {
                  <p class="ya-upload__status">Uploading photo…</p>
                }
              </div>
            </div>
          }
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
              <label class="ya-label" for="phone">Phone <span class="ya-req">*</span></label>
              <input
                id="phone"
                class="ya-input"
                [class.ya-input--error]="showError('phone')"
                type="tel"
                inputmode="numeric"
                maxlength="10"
                formControlName="phone"
                placeholder="10-digit mobile number"
                (input)="onPhoneInput($event)"
              />
              @if (showError('phone')) {
                <p class="ya-error">{{ errorText('phone') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="email">Email</label>
              <input
                id="email"
                class="ya-input"
                [class.ya-input--error]="showError('email')"
                type="email"
                formControlName="email"
                placeholder="Enter email"
              />
              @if (showError('email')) {
                <p class="ya-error">{{ errorText('email') }}</p>
              }
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
                [placeholder]="isEdit() ? 'Leave blank to keep current' : 'Enter password'"
              />
              @if (showError('password')) {
                <p class="ya-error">{{ errorText('password') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="license_no">License no</label>
              <input id="license_no" class="ya-input" formControlName="license_no" placeholder="Enter license no" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="license_expiry_date">License expiry</label>
              <app-ya-datepicker formControlName="license_expiry_date" placeholder="Select expiry date" />
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="address">Address</label>
              <textarea
                id="address"
                class="ya-input ya-input--area"
                rows="4"
                formControlName="address"
                placeholder="Enter address"
              ></textarea>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="verification_status">Verification status <span class="ya-req">*</span></label>
              <select
                id="verification_status"
                class="ya-input"
                [class.ya-input--error]="showError('verification_status')"
                formControlName="verification_status"
              >
                @for (opt of verificationOpts; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (showError('verification_status')) {
                <p class="ya-error">{{ errorText('verification_status') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="availability_status">Availability <span class="ya-req">*</span></label>
              <select
                id="availability_status"
                class="ya-input"
                [class.ya-input--error]="showError('availability_status')"
                formControlName="availability_status"
              >
                @for (opt of availabilityOpts; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (showError('availability_status')) {
                <p class="ya-error">{{ errorText('availability_status') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="online_status">Online status <span class="ya-req">*</span></label>
              <select
                id="online_status"
                class="ya-input"
                [class.ya-input--error]="showError('online_status')"
                formControlName="online_status"
              >
                @for (opt of onlineOpts; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (showError('online_status')) {
                <p class="ya-error">{{ errorText('online_status') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="is_active">Active <span class="ya-req">*</span></label>
              <select
                id="is_active"
                class="ya-input"
                [class.ya-input--error]="showError('is_active')"
                formControlName="is_active"
              >
                @for (opt of activeOpts; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (showError('is_active')) {
                <p class="ya-error">{{ errorText('is_active') }}</p>
              }
            </div>
          </div>

          @if (error()) {
            <p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
          }

          <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/drivers">Cancel</a>
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving() || uploading()">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create driver' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class DriverFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly photoPreview = signal<string | null>(null);
  private driverId: string | null = null;

  readonly verificationOpts: FieldOpt[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];
  readonly availabilityOpts: FieldOpt[] = [
    { label: 'Available', value: 'available' },
    { label: 'On Ride', value: 'on_trip' },
    { label: 'Leave', value: 'on_leave' },
    { label: 'Suspend', value: 'suspended' },
  ];
  readonly onlineOpts: FieldOpt[] = [
    { label: 'Offline', value: 'offline' },
    { label: 'Online', value: 'online' },
    { label: 'Busy', value: 'busy' },
  ];
  readonly activeOpts: FieldOpt[] = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
    phone: this.fb.nonNullable.control('', [phoneValidator]),
    email: this.fb.nonNullable.control('', [Validators.email]),
    password: this.fb.nonNullable.control(''),
    license_no: this.fb.nonNullable.control(''),
    license_expiry_date: this.fb.control<string | null>(null),
    address: this.fb.nonNullable.control(''),
    verification_status: this.fb.nonNullable.control('pending', [Validators.required]),
    availability_status: this.fb.nonNullable.control('available', [Validators.required]),
    online_status: this.fb.nonNullable.control('offline', [Validators.required]),
    is_active: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.driverId = id;
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

  /** Normalize stored phone values like +91XXXXXXXXXX → last 10 digits. */
  private normalizePhone(value: unknown): string {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
  }

  errorText(name: keyof typeof this.form.controls): string {
    const c = this.form.controls[name];
    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('minlength')) {
      const min = c.getError('minlength')?.requiredLength;
      return `Must be at least ${min} characters.`;
    }
    if (c.hasError('maxlength')) return 'Value is too long.';
    if (c.hasError('email')) return 'Enter a valid email address.';
    if (c.hasError('phone')) return 'Enter a valid 10-digit phone number.';
    return 'Invalid value.';
  }

  private load(id: string): void {
    this.api.get(`/drivers/${id}`).subscribe({
      next: (res) => {
        const d = (res.data || {}) as Record<string, unknown>;
        let verification = String(d['verification_status'] ?? 'pending');
        let isActive = Boolean(d['is_active']);
        if (verification === 'blocked') {
          verification = 'rejected';
          isActive = false;
        }
        this.form.patchValue({
          name: String(d['name'] ?? ''),
          phone: this.normalizePhone(d['phone']),
          email: String(d['email'] ?? ''),
          password: '',
          license_no: String(d['license_no'] ?? ''),
          license_expiry_date: d['license_expiry_date'] ? String(d['license_expiry_date']) : null,
          address: String(d['address'] ?? ''),
          verification_status: verification,
          availability_status: String(d['availability_status'] ?? 'available'),
          online_status: String(d['online_status'] ?? 'offline'),
          is_active: isActive,
        });
        this.photoPreview.set(
          driverPhotoUrl({
            id: String(d['id'] ?? id),
            photo_url: d['photo_url'] != null ? String(d['photo_url']) : null,
          }) ?? mediaUrl(d['profile_image_url'] != null ? String(d['profile_image_url']) : null),
        );
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load driver');
      },
    });
  }

  onPhotoPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.driverId) return;
    const body = new FormData();
    body.append('file', file);
    this.uploading.set(true);
    this.api.uploadDriverPhoto(this.driverId, body).subscribe({
      next: (d) => {
        this.uploading.set(false);
        const url =
          driverPhotoUrl({ id: this.driverId, photo_url: d.photo_url }) ??
          mediaUrl(d.profile_image_url) ??
          this.photoPreview();
        this.photoPreview.set(url ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : url);
        this.snack.open('Driver photo updated', 'OK', { duration: 2200 });
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Photo upload failed');
      },
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
      phone: raw.phone.trim(),
      email: raw.email.trim() || null,
      license_no: raw.license_no.trim() || null,
      license_expiry_date: raw.license_expiry_date || null,
      address: raw.address.trim() || null,
      verification_status: raw.verification_status,
      availability_status: raw.availability_status,
      online_status: raw.online_status,
      is_active: raw.is_active,
    };
    if (raw.password.trim()) body['password'] = raw.password;

    const req$ = this.isEdit()
      ? this.api.update(`/drivers/${this.driverId}`, body)
      : this.api.create('/drivers', { ...body, password: raw.password });

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Driver updated' : 'Driver created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/drivers');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(err instanceof Error ? err.message : 'Save failed');
      },
    });
  }
}
