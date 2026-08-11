import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { YaDatepickerComponent } from '../../shared/ya-datepicker.component';

type Opt = { id: string; label: string };

@Component({
  selector: 'app-assignment-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule, YaDatepickerComponent],
  template: `
    <div class="page-wrap space-y-5">
      <a
        routerLink="/driver-assignments"
        class="inline-flex items-center gap-1 text-sm font-medium"
        [style.color]="'var(--ya-primary)'"
      >
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to assignments
      </a>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">Assign driver to vehicle</h2>
            <p class="page-subtitle">
              One vehicle can only have one current driver. End the current assignment first, then assign the car to another driver.
            </p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="driver_id">Driver <span class="ya-req">*</span></label>
              <select
                id="driver_id"
                class="ya-input"
                [class.ya-input--error]="showError('driver_id')"
                formControlName="driver_id"
              >
                <option value="">Select driver</option>
                @for (d of drivers(); track d.id) {
                  <option [value]="d.id">{{ d.label }}</option>
                }
              </select>
              @if (showError('driver_id')) {
                <p class="ya-error">Driver is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="vehicle_id">Vehicle <span class="ya-req">*</span></label>
              <select
                id="vehicle_id"
                class="ya-input"
                [class.ya-input--error]="showError('vehicle_id')"
                formControlName="vehicle_id"
              >
                <option value="">Select vehicle</option>
                @for (v of vehicles(); track v.id) {
                  <option [value]="v.id">{{ v.label }}</option>
                }
              </select>
              @if (showError('vehicle_id')) {
                <p class="ya-error">Vehicle is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label">Assigned from</label>
              <app-ya-datepicker formControlName="assigned_from" placeholder="Today (default)" />
            </div>
          </div>

          <div class="mt-6 flex flex-wrap gap-2">
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Assigning…' : 'Assign' }}
            </button>
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/driver-assignments">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AssignmentFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly saving = signal(false);
  readonly drivers = signal<Opt[]>([]);
  readonly vehicles = signal<Opt[]>([]);

  readonly form = this.fb.nonNullable.group({
    driver_id: ['', Validators.required],
    vehicle_id: ['', Validators.required],
    assigned_from: ['' as string | null],
  });

  ngOnInit(): void {
    this.api.list('/drivers', { page: 1, per_page: 200 }).subscribe({
      next: (res) => {
        const rows = (Array.isArray(res.data) ? res.data : []) as Array<Record<string, unknown>>;
        this.drivers.set(
          rows.map((d) => ({
            id: String(d['id']),
            label: `${d['name'] ?? 'Driver'} · ${d['phone'] ?? ''}`,
          })),
        );
      },
    });

    this.api.list('/vehicles', { page: 1, per_page: 500 }).subscribe({
      next: (res) => {
        const rows = (Array.isArray(res.data) ? res.data : []) as Array<Record<string, unknown>>;
        this.vehicles.set(
          rows
            .filter((v) => v['is_active'] !== false)
            .map((v) => ({
              id: String(v['id']),
              label: `${v['vehicle_name'] ?? 'Vehicle'}${v['registration_no'] ? ` · ${v['registration_no']}` : ''}`,
            })),
        );
      },
    });
  }

  showError(control: string): boolean {
    const c = this.form.get(control);
    return Boolean(c && c.invalid && (c.dirty || c.touched));
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      driver_id: v.driver_id,
      vehicle_id: v.vehicle_id,
    };
    if (v.assigned_from) body['assigned_from'] = v.assigned_from;

    this.saving.set(true);
    this.api.create('/driver-assignments', body).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Driver assigned to vehicle', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/driver-assignments');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Assign failed', 'Close');
      },
    });
  }
}
