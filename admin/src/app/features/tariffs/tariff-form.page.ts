import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { YaDatepickerComponent } from '../../shared/ya-datepicker.component';

type Opt = { id: string; name: string };
type BoolOpt = { label: string; value: boolean };

const TRIP_TYPES: Array<{ label: string; value: string }> = [
  { label: 'One way', value: 'one_way' },
  { label: 'Round trip', value: 'round_trip' },
  { label: 'Airport', value: 'airport' },
  { label: 'Outstation', value: 'outstation' },
  { label: 'Local rental', value: 'local_rental' },
];

const YES_NO: BoolOpt[] = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

/** Digits only (optional one decimal), max length. */
function digitAmount(value: string, maxLen = 8): string {
  const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  const normalized =
    dot === -1
      ? cleaned
      : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
  return normalized.slice(0, maxLen);
}

function numOrZero(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

@Component({
  selector: 'app-tariff-form-page',
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
      <a routerLink="/tariffs" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to tariffs
      </a>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit tariff' : 'Add tariff' }}</h2>
            <p class="page-subtitle">
              Rates used to estimate fare when a customer books. Leave Route empty for a category-wide default.
            </p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="vehicle_category_id">Vehicle category <span class="ya-req">*</span></label>
              <select
                id="vehicle_category_id"
                class="ya-input"
                [class.ya-input--error]="showError('vehicle_category_id')"
                formControlName="vehicle_category_id"
              >
                <option value="">Select category</option>
                @for (c of categories(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              @if (showError('vehicle_category_id')) {
                <p class="ya-error">Category is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="trip_type">Trip type <span class="ya-req">*</span></label>
              <select
                id="trip_type"
                class="ya-input"
                [class.ya-input--error]="showError('trip_type')"
                formControlName="trip_type"
              >
                <option value="">Select trip type</option>
                @for (t of tripTypes; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
              @if (showError('trip_type')) {
                <p class="ya-error">Trip type is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="route_id">Route (optional)</label>
              <select id="route_id" class="ya-input" formControlName="route_id">
                <option value="">All routes (category default)</option>
                @for (r of routes(); track r.id) {
                  <option [value]="r.id">{{ r.name }}</option>
                }
              </select>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="rate_per_km">Rate per km (₹) <span class="ya-req">*</span></label>
              <input
                id="rate_per_km"
                class="ya-input"
                [class.ya-input--error]="showError('rate_per_km')"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="rate_per_km"
                (input)="onDigitInput('rate_per_km', $event)"
                placeholder="0"
              />
              @if (showError('rate_per_km')) {
                <p class="ya-error">Enter a valid rate</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="base_fare">Base fare (₹)</label>
              <input
                id="base_fare"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="base_fare"
                (input)="onDigitInput('base_fare', $event)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="driver_batta">Driver batta (₹)</label>
              <input
                id="driver_batta"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="driver_batta"
                (input)="onDigitInput('driver_batta', $event)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="minimum_fare">Minimum fare (₹)</label>
              <input
                id="minimum_fare"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="minimum_fare"
                (input)="onDigitInput('minimum_fare', $event)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="minimum_km">Minimum km</label>
              <input
                id="minimum_km"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="minimum_km"
                (input)="onDigitInput('minimum_km', $event)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="extra_km_rate">Extra km rate (₹)</label>
              <input
                id="extra_km_rate"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="extra_km_rate"
                (input)="onDigitInput('extra_km_rate', $event)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="night_charge">Night charge (₹)</label>
              <input
                id="night_charge"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="night_charge"
                (input)="onDigitInput('night_charge', $event)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="permit_charge">Permit charge (₹)</label>
              <input
                id="permit_charge"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="8"
                formControlName="permit_charge"
                (input)="onDigitInput('permit_charge', $event)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="gst_percentage">GST %</label>
              <input
                id="gst_percentage"
                class="ya-input"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                maxlength="5"
                formControlName="gst_percentage"
                (input)="onDigitInput('gst_percentage', $event, 5)"
                placeholder="0"
              />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label">Effective from <span class="ya-req">*</span></label>
              <app-ya-datepicker
                formControlName="effective_from"
                placeholder="Select start date"
                [invalid]="showError('effective_from')"
              />
              @if (showError('effective_from')) {
                <p class="ya-error">Start date is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label">Effective to</label>
              <app-ya-datepicker formControlName="effective_to" placeholder="Select end date (optional)" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="is_active">Active</label>
              <select id="is_active" class="ya-input" formControlName="is_active">
                @for (opt of yesNo; track opt.label) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap gap-2">
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create tariff' }}
            </button>
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/tariffs">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TariffFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly categories = signal<Opt[]>([]);
  readonly routes = signal<Opt[]>([]);
  readonly tripTypes = TRIP_TYPES;
  readonly yesNo = YES_NO;

  private tariffId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    vehicle_category_id: ['', Validators.required],
    trip_type: ['', Validators.required],
    route_id: [''],
    rate_per_km: ['', Validators.required],
    base_fare: [''],
    driver_batta: [''],
    minimum_km: [''],
    minimum_fare: [''],
    extra_km_rate: [''],
    night_charge: [''],
    permit_charge: [''],
    gst_percentage: [''],
    effective_from: ['', Validators.required],
    effective_to: ['' as string | null],
    is_active: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.tariffId = id;
    this.isEdit.set(Boolean(id));

    if (!this.form.controls.effective_from.value) {
      this.form.controls.effective_from.setValue(new Date().toISOString().slice(0, 10));
    }

    this.api.list('/vehicle-categories', { page: 1, per_page: 200 }).subscribe({
      next: (res) => {
        const rows = (Array.isArray(res.data) ? res.data : []) as Array<Record<string, unknown>>;
        this.categories.set(
          rows.map((r) => ({ id: String(r['id']), name: String(r['name'] ?? `Category ${r['id']}`) })),
        );
      },
    });

    this.api.list('/routes', { page: 1, per_page: 500 }).subscribe({
      next: (res) => {
        const rows = (Array.isArray(res.data) ? res.data : []) as Array<Record<string, unknown>>;
        this.routes.set(
          rows.map((r) => ({
            id: String(r['id']),
            name: String(r['title'] ?? r['corridor'] ?? `Route ${r['id']}`),
          })),
        );
      },
    });

    if (id) {
      this.api.get(`/tariffs/${id}`).subscribe({
        next: (res) => {
          const t = (res.data || {}) as Record<string, unknown>;
          this.form.patchValue({
            vehicle_category_id: String(t['vehicle_category_id'] ?? ''),
            trip_type: String(t['trip_type'] ?? ''),
            route_id: t['route_id'] != null ? String(t['route_id']) : '',
            rate_per_km: String(t['rate_per_km'] ?? ''),
            base_fare: String(t['base_fare'] ?? ''),
            driver_batta: String(t['driver_batta'] ?? ''),
            minimum_km: String(t['minimum_km'] ?? ''),
            minimum_fare: String(t['minimum_fare'] ?? ''),
            extra_km_rate: String(t['extra_km_rate'] ?? ''),
            night_charge: String(t['night_charge'] ?? ''),
            permit_charge: String(t['permit_charge'] ?? ''),
            gst_percentage: String(t['gst_percentage'] ?? ''),
            effective_from: String(t['effective_from'] ?? ''),
            effective_to: t['effective_to'] != null ? String(t['effective_to']) : null,
            is_active: Boolean(t['is_active'] ?? true),
          });
        },
        error: (err: unknown) =>
          this.snack.open(err instanceof Error ? err.message : 'Failed to load tariff', 'Close'),
      });
    }
  }

  onDigitInput(
    key:
      | 'rate_per_km'
      | 'base_fare'
      | 'driver_batta'
      | 'minimum_km'
      | 'minimum_fare'
      | 'extra_km_rate'
      | 'night_charge'
      | 'permit_charge'
      | 'gst_percentage',
    event: Event,
    maxLen = 8,
  ): void {
    const el = event.target as HTMLInputElement;
    const next = digitAmount(el.value, maxLen);
    el.value = next;
    this.form.controls[key].setValue(next, { emitEvent: false });
    this.form.controls[key].markAsDirty();
  }

  showError(control: string): boolean {
    const c = this.form.get(control);
    return Boolean(c && c.invalid && (c.dirty || c.touched));
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (!v.rate_per_km || numOrZero(v.rate_per_km) < 0) {
      this.form.controls.rate_per_km.setErrors({ required: true });
      return;
    }
    const body = {
      vehicle_category_id: v.vehicle_category_id,
      trip_type: v.trip_type,
      route_id: v.route_id ? v.route_id : null,
      rate_per_km: numOrZero(v.rate_per_km),
      base_fare: numOrZero(v.base_fare),
      driver_batta: numOrZero(v.driver_batta),
      minimum_km: numOrZero(v.minimum_km),
      minimum_fare: numOrZero(v.minimum_fare),
      extra_km_rate: numOrZero(v.extra_km_rate),
      night_charge: numOrZero(v.night_charge),
      permit_charge: numOrZero(v.permit_charge),
      gst_percentage: numOrZero(v.gst_percentage),
      effective_from: v.effective_from,
      effective_to: v.effective_to || null,
      is_active: v.is_active,
    };

    this.saving.set(true);
    const req$ =
      this.isEdit() && this.tariffId
        ? this.api.update(`/tariffs/${this.tariffId}`, body)
        : this.api.create('/tariffs', body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Tariff updated' : 'Tariff created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/tariffs');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Save failed', 'Close');
      },
    });
  }
}
