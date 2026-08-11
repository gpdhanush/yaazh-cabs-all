import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { YaImageCropperComponent } from '../../shared/ya-image-cropper.component';

type FieldOpt = { label: string; value: string | boolean | number };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

@Component({
  selector: 'app-vehicle-category-form-page',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    YaImageCropperComponent,
  ],
  template: `
    <div class="page-wrap space-y-5">
      <a routerLink="/vehicle-categories" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to categories
      </a>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit category' : 'Add vehicle category' }}</h2>
            <p class="page-subtitle">
              Categories power fleet cards on the website and vehicle assignment in admin.
            </p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="name">Name <span class="ya-req">*</span></label>
              <input
                id="name"
                class="ya-input"
                [class.ya-input--error]="showError('name')"
                formControlName="name"
                placeholder="e.g. Sedan 4+1"
                (input)="onNameInput()"
              />
              @if (showError('name')) {
                <p class="ya-error">{{ errorText('name') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="slug">Slug <span class="ya-req">*</span></label>
              <input
                id="slug"
                class="ya-input"
                [class.ya-input--error]="showError('slug')"
                formControlName="slug"
                placeholder="sedan-4-1"
                (input)="slugTouched = true"
              />
              @if (showError('slug')) {
                <p class="ya-error">{{ errorText('slug') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="seating_capacity">Seating capacity <span class="ya-req">*</span></label>
              <input
                id="seating_capacity"
                class="ya-input"
                type="number"
                min="1"
                formControlName="seating_capacity"
                [class.ya-input--error]="showError('seating_capacity')"
              />
              @if (showError('seating_capacity')) {
                <p class="ya-error">{{ errorText('seating_capacity') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="luggage_capacity">Luggage</label>
              <input id="luggage_capacity" class="ya-input" formControlName="luggage_capacity" placeholder="e.g. 2 bags" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="one_way_rate_per_km">One-way ₹/km</label>
              <input id="one_way_rate_per_km" class="ya-input" type="number" min="0" step="0.01" formControlName="one_way_rate_per_km" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="round_trip_rate_per_km">Round-trip ₹/km</label>
              <input id="round_trip_rate_per_km" class="ya-input" type="number" min="0" step="0.01" formControlName="round_trip_rate_per_km" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="driver_batta">Driver batta</label>
              <input id="driver_batta" class="ya-input" type="number" min="0" step="0.01" formControlName="driver_batta" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="minimum_km_per_day">Minimum km/day</label>
              <input id="minimum_km_per_day" class="ya-input" type="number" min="0" step="0.01" formControlName="minimum_km_per_day" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="display_order">Display order</label>
              <input id="display_order" class="ya-input" type="number" formControlName="display_order" />
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="is_active">Active</label>
              <select id="is_active" class="ya-input" formControlName="is_active">
                @for (opt of boolOpts; track opt.label) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label">Category image</label>
              <div class="ya-upload" [class.ya-upload--filled]="!!form.controls.image_url.value">
                <div class="ya-upload__preview">
                  @if (form.controls.image_url.value) {
                    <img [src]="form.controls.image_url.value" alt="Category preview" />
                  } @else {
                    <div class="ya-upload__placeholder">
                      <mat-icon>directions_car</mat-icon>
                      <span>16:10 fleet card</span>
                    </div>
                  }
                </div>
                <div class="ya-upload__body">
                  <p class="ya-upload__title">
                    {{ form.controls.image_url.value ? 'Replace category photo' : 'Add category photo' }}
                  </p>
                  <p class="ya-upload__hint">
                    Appears on the website fleet section. Pick any image — you will crop it to 16:10 before upload.
                  </p>
                  <div class="ya-upload__actions">
                    <label class="ya-upload__btn">
                      <mat-icon>{{ form.controls.image_url.value ? 'photo_camera' : 'upload' }}</mat-icon>
                      {{ form.controls.image_url.value ? 'Change image' : 'Choose image' }}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        hidden
                        (change)="onImageSelected($event)"
                      />
                    </label>
                    @if (form.controls.image_url.value) {
                      <button
                        mat-stroked-button
                        class="ya-btn-ghost"
                        type="button"
                        (click)="form.controls.image_url.setValue('')"
                      >
                        Remove
                      </button>
                    }
                  </div>
                  @if (uploading()) {
                    <p class="ya-upload__status">Uploading cropped image…</p>
                  }
                </div>
              </div>
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="description">Description</label>
              <textarea id="description" class="ya-input ya-input--area" rows="3" formControlName="description"></textarea>
            </div>
          </div>

          @if (error()) {
            <p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
          }

          <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/vehicle-categories">Cancel</a>
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving() || uploading()">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create category' }}
            </button>
          </div>
        </form>
      </div>

      @if (cropSrc()) {
        <app-ya-image-cropper [src]="cropSrc()!" (applyCrop)="onCropApplied($event)" (cancel)="closeCropper()" />
      }
    </div>
  `,
})
export class VehicleCategoryFormPage implements OnInit {
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
  readonly cropSrc = signal<string | null>(null);
  private categoryId: string | null = null;
  private cropObjectUrl: string | null = null;
  slugTouched = false;

  readonly boolOpts: FieldOpt[] = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    slug: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    seating_capacity: this.fb.nonNullable.control(4, [Validators.required, Validators.min(1)]),
    luggage_capacity: this.fb.nonNullable.control(''),
    description: this.fb.nonNullable.control(''),
    image_url: this.fb.nonNullable.control(''),
    one_way_rate_per_km: this.fb.nonNullable.control(0),
    round_trip_rate_per_km: this.fb.nonNullable.control(0),
    driver_batta: this.fb.nonNullable.control(0),
    minimum_km_per_day: this.fb.nonNullable.control(0),
    display_order: this.fb.nonNullable.control(0),
    is_active: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.categoryId = id;
      this.slugTouched = true;
      this.load(id);
    }
  }

  onNameInput(): void {
    if (this.slugTouched) return;
    this.form.controls.slug.setValue(slugify(this.form.controls.name.value), { emitEvent: false });
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  errorText(name: keyof typeof this.form.controls): string {
    const c = this.form.controls[name];
    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('minlength')) return 'Value is too short.';
    if (c.hasError('min')) return 'Must be at least 1.';
    return 'Invalid value.';
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Image must be under 5 MB.');
      return;
    }
    this.closeCropper();
    this.cropObjectUrl = URL.createObjectURL(file);
    this.cropSrc.set(this.cropObjectUrl);
  }

  onCropApplied(blob: Blob): void {
    this.closeCropper();
    const body = new FormData();
    body.append('file', blob, `category-${Date.now()}.jpg`);
    this.uploading.set(true);
    this.api.upload('/uploads', body).subscribe({
      next: (res) => {
        this.uploading.set(false);
        const url = (res.data as { url?: string })?.url;
        if (url) this.form.controls.image_url.setValue(url);
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Upload failed');
      },
    });
  }

  closeCropper(): void {
    this.cropSrc.set(null);
    if (this.cropObjectUrl) {
      URL.revokeObjectURL(this.cropObjectUrl);
      this.cropObjectUrl = null;
    }
  }

  private load(id: string): void {
    this.api.get(`/vehicle-categories/${id}`).subscribe({
      next: (res) => {
        const d = (res.data || {}) as Record<string, unknown>;
        this.form.patchValue({
          name: String(d['name'] ?? ''),
          slug: String(d['slug'] ?? ''),
          seating_capacity: Number(d['seating_capacity'] ?? 4),
          luggage_capacity: String(d['luggage_capacity'] ?? ''),
          description: String(d['description'] ?? ''),
          image_url: String(d['image_url'] ?? ''),
          one_way_rate_per_km: Number(d['one_way_rate_per_km'] ?? 0),
          round_trip_rate_per_km: Number(d['round_trip_rate_per_km'] ?? 0),
          driver_batta: Number(d['driver_batta'] ?? 0),
          minimum_km_per_day: Number(d['minimum_km_per_day'] ?? 0),
          display_order: Number(d['display_order'] ?? 0),
          is_active: d['is_active'] !== false,
        });
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Failed to load category'),
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
      name: raw.name.trim(),
      slug: raw.slug.trim(),
      seating_capacity: Number(raw.seating_capacity),
      luggage_capacity: raw.luggage_capacity.trim() || null,
      description: raw.description.trim() || null,
      image_url: raw.image_url.trim() || null,
      one_way_rate_per_km: Number(raw.one_way_rate_per_km),
      round_trip_rate_per_km: Number(raw.round_trip_rate_per_km),
      driver_batta: Number(raw.driver_batta),
      minimum_km_per_day: Number(raw.minimum_km_per_day),
      display_order: Number(raw.display_order),
      is_active: raw.is_active,
    };
    const req$ = this.isEdit()
      ? this.api.update(`/vehicle-categories/${this.categoryId}`, body)
      : this.api.create('/vehicle-categories', body);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Category updated' : 'Category created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/vehicle-categories');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(err instanceof Error ? err.message : 'Save failed');
      },
    });
  }
}
