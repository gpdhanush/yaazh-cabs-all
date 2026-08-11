import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { YaDatepickerComponent } from '../../shared/ya-datepicker.component';

type CategoryOpt = { id: string; name: string };
type FieldOpt = { label: string; value: string | boolean };

@Component({
  selector: 'app-vehicle-form-page',
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
      <a routerLink="/vehicles" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to vehicles
      </a>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit vehicle' : 'Add vehicle' }}</h2>
            <p class="page-subtitle">Link a fleet vehicle to a category for bookings and assignments.</p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="vehicle_name">Vehicle name <span class="ya-req">*</span></label>
              <input
                id="vehicle_name"
                class="ya-input"
                [class.ya-input--error]="showError('vehicle_name')"
                formControlName="vehicle_name"
                placeholder="e.g. White Dzire"
              />
              @if (showError('vehicle_name')) {
                <p class="ya-error">{{ errorText('vehicle_name') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="category_id">Category <span class="ya-req">*</span></label>
              <select
                id="category_id"
                class="ya-input"
                [class.ya-input--error]="showError('category_id')"
                formControlName="category_id"
              >
                <option value="">Select category</option>
                @for (c of categories(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              @if (showError('category_id')) {
                <p class="ya-error">{{ errorText('category_id') }}</p>
              }
              @if (!categories().length) {
                <p class="mt-1 text-xs" style="color: var(--ya-muted)">
                  No categories yet.
                  <a routerLink="/vehicle-categories/new" [style.color]="'var(--ya-primary)'">Create one</a>
                </p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="registration_no">Registration no</label>
              <input id="registration_no" class="ya-input" formControlName="registration_no" placeholder="TN-XX-XXXX" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="model_name">Model</label>
              <input id="model_name" class="ya-input" formControlName="model_name" placeholder="Dzire / Innova…" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="color">Color</label>
              <input id="color" class="ya-input" formControlName="color" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="fuel_type">Fuel type</label>
              <select id="fuel_type" class="ya-input" formControlName="fuel_type">
                @for (opt of fuelOpts; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label">RC expiry</label>
              <app-ya-datepicker formControlName="rc_expiry_date" placeholder="Select date" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label">Insurance expiry</label>
              <app-ya-datepicker formControlName="insurance_expiry_date" placeholder="Select date" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label">Permit expiry</label>
              <app-ya-datepicker formControlName="permit_expiry_date" placeholder="Select date" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label">Pollution expiry</label>
              <app-ya-datepicker formControlName="pollution_expiry_date" placeholder="Select date" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="is_active">Active</label>
              <select id="is_active" class="ya-input" formControlName="is_active">
                @for (opt of boolOpts; track opt.label) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
          </div>

          @if (error()) {
            <p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
          }

          <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/vehicles">Cancel</a>
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create vehicle' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class VehicleFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = signal<CategoryOpt[]>([]);
  private vehicleId: string | null = null;

  readonly boolOpts: FieldOpt[] = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];
  readonly fuelOpts: FieldOpt[] = [
    { label: 'Petrol', value: 'petrol' },
    { label: 'Diesel', value: 'diesel' },
    { label: 'CNG', value: 'cng' },
    { label: 'Electric', value: 'electric' },
    { label: 'Hybrid', value: 'hybrid' },
    { label: 'Other', value: 'other' },
  ];

  readonly form = this.fb.group({
    vehicle_name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    category_id: this.fb.nonNullable.control('', [Validators.required]),
    registration_no: this.fb.nonNullable.control(''),
    model_name: this.fb.nonNullable.control(''),
    color: this.fb.nonNullable.control(''),
    fuel_type: this.fb.nonNullable.control('diesel'),
    rc_expiry_date: this.fb.control<string | null>(null),
    insurance_expiry_date: this.fb.control<string | null>(null),
    permit_expiry_date: this.fb.control<string | null>(null),
    pollution_expiry_date: this.fb.control<string | null>(null),
    is_active: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    this.loadCategories();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.vehicleId = id;
      this.load(id);
    }
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  errorText(name: keyof typeof this.form.controls): string {
    const c = this.form.controls[name];
    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('minlength')) return 'Value is too short.';
    return 'Invalid value.';
  }

  private loadCategories(): void {
    this.api.list('/vehicle-categories').subscribe({
      next: (res) => {
        const rows = Array.isArray(res.data) ? (res.data as CategoryOpt[]) : [];
        this.categories.set(rows.map((c) => ({ id: String(c.id), name: c.name })));
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Failed to load categories'),
    });
  }

  private load(id: string): void {
    this.api.get(`/vehicles/${id}`).subscribe({
      next: (res) => {
        const d = (res.data || {}) as Record<string, unknown>;
        this.form.patchValue({
          vehicle_name: String(d['vehicle_name'] ?? ''),
          category_id: String(d['category_id'] ?? ''),
          registration_no: String(d['registration_no'] ?? ''),
          model_name: String(d['model_name'] ?? ''),
          color: String(d['color'] ?? ''),
          fuel_type: String(d['fuel_type'] ?? 'diesel'),
          rc_expiry_date: d['rc_expiry_date'] ? String(d['rc_expiry_date']) : null,
          insurance_expiry_date: d['insurance_expiry_date'] ? String(d['insurance_expiry_date']) : null,
          permit_expiry_date: d['permit_expiry_date'] ? String(d['permit_expiry_date']) : null,
          pollution_expiry_date: d['pollution_expiry_date'] ? String(d['pollution_expiry_date']) : null,
          is_active: d['is_active'] !== false,
        });
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Failed to load vehicle'),
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
    const body = {
      vehicle_name: raw.vehicle_name.trim(),
      category_id: raw.category_id,
      registration_no: raw.registration_no.trim() || null,
      model_name: raw.model_name.trim() || null,
      color: raw.color.trim() || null,
      fuel_type: raw.fuel_type,
      rc_expiry_date: raw.rc_expiry_date || null,
      insurance_expiry_date: raw.insurance_expiry_date || null,
      permit_expiry_date: raw.permit_expiry_date || null,
      pollution_expiry_date: raw.pollution_expiry_date || null,
      is_active: raw.is_active,
    };
    const req$ = this.isEdit()
      ? this.api.update(`/vehicles/${this.vehicleId}`, body)
      : this.api.create('/vehicles', body);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Vehicle updated' : 'Vehicle created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/vehicles');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(err instanceof Error ? err.message : 'Save failed');
      },
    });
  }
}
