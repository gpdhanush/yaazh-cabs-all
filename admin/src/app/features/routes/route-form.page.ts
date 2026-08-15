import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { mediaUrl } from '../../core/api/media-url';
import { YaImageCropperComponent } from '../../shared/ya-image-cropper.component';

type CityOpt = { id: string; name: string };
type FieldOpt = { label: string; value: boolean };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

@Component({
  selector: 'app-route-form-page',
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
      <div class="flex flex-wrap items-center gap-3">
        <a routerLink="/routes" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
          <mat-icon class="!text-base">arrow_back</mat-icon>
          Back to routes
        </a>
      </div>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit route' : 'Add new route' }}</h2>
            <p class="page-subtitle">
              {{
                isEdit()
                  ? 'Website cards use pickup → drop cities (not only the title). Set Popular = Yes to show on the home page.'
                  : 'Website cards use pickup → drop cities. Keep Popular = Yes to list this route on the home page.'
              }}
            </p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="pickup_city_id">Pickup city <span class="ya-req">*</span></label>
              <select
                id="pickup_city_id"
                class="ya-input"
                [class.ya-input--error]="showError('pickup_city_id')"
                formControlName="pickup_city_id"
                (change)="onCitiesChanged()"
              >
                <option value="">Select pickup city</option>
                @for (c of cities(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              @if (showError('pickup_city_id')) {
                <p class="ya-error">{{ errorText('pickup_city_id') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="drop_city_id">Drop city <span class="ya-req">*</span></label>
              <select
                id="drop_city_id"
                class="ya-input"
                [class.ya-input--error]="showError('drop_city_id')"
                formControlName="drop_city_id"
                (change)="onCitiesChanged()"
              >
                <option value="">Select drop city</option>
                @for (c of cities(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              @if (showError('drop_city_id')) {
                <p class="ya-error">{{ errorText('drop_city_id') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="title">Title <span class="ya-req">*</span></label>
              <input
                id="title"
                class="ya-input"
                [class.ya-input--error]="showError('title')"
                formControlName="title"
                placeholder="e.g. Udumalpet to Coimbatore Cabs"
                (input)="onTitleInput()"
              />
              <p class="mt-1 text-xs" style="color: var(--ya-muted)">
                Auto-filled from cities. The website card shows city names, not this title alone.
              </p>
              @if (showError('title')) {
                <p class="ya-error">{{ errorText('title') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="slug">Slug <span class="ya-req">*</span></label>
              <input
                id="slug"
                class="ya-input"
                [class.ya-input--error]="showError('slug')"
                formControlName="slug"
                placeholder="udumalpet-to-coimbatore"
                (input)="slugTouched = true"
              />
              @if (showError('slug')) {
                <p class="ya-error">{{ errorText('slug') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="distance_km">Distance (km) <span class="ya-req">*</span></label>
              <input
                id="distance_km"
                class="ya-input"
                [class.ya-input--error]="showError('distance_km')"
                type="number"
                min="0"
                step="0.1"
                formControlName="distance_km"
                placeholder="0"
              />
              @if (showError('distance_km')) {
                <p class="ya-error">{{ errorText('distance_km') }}</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="amount">Website amount (₹)</label>
              <input
                id="amount"
                class="ya-input"
                type="number"
                min="0"
                step="1"
                formControlName="amount"
                placeholder="e.g. 2700"
              />
              <p class="mt-1 text-xs" style="color: var(--ya-muted)">
                Shown on the home page route card. Leave empty to fall back to tariff calculation.
              </p>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="duration_minutes">Duration (minutes)</label>
              <input
                id="duration_minutes"
                class="ya-input"
                type="number"
                min="0"
                step="1"
                formControlName="duration_minutes"
                placeholder="Optional"
              />
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label">Card image</label>
              <div class="ya-upload">
                <div class="ya-upload__preview">
                  @if (form.controls.image_url.value) {
                    <img [src]="previewImage()" alt="Route card preview" />
                  } @else {
                    <div class="ya-upload__placeholder">
                      <mat-icon>image</mat-icon>
                      <span>16:10 card preview</span>
                    </div>
                  }
                </div>
                <div class="ya-upload__body">
                  <p class="ya-upload__title">Upload a photo for the website route card</p>
                  <p class="ya-upload__hint">
                    JPG, PNG or WebP · max 5 MB. You’ll crop to the card size before saving.
                  </p>
                  <div class="ya-upload__actions">
                    <label class="ya-upload__btn">
                      <mat-icon>upload</mat-icon>
                      Choose image
                      <input
                        #fileInput
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        hidden
                        (change)="onImageSelected($event)"
                      />
                    </label>
                    @if (form.controls.image_url.value) {
                      <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="clearImage()">
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

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="is_popular">Show on website (Popular) <span class="ya-req">*</span></label>
              <select id="is_popular" class="ya-input" formControlName="is_popular">
                @for (opt of boolOpts; track opt.label) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
              <p class="mt-1 text-xs" style="color: var(--ya-muted)">
                Home page “Popular routes” only lists routes with Popular = Yes and Active = Yes.
              </p>
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
              <label class="ya-label" for="content">Short description / tag</label>
              <textarea
                id="content"
                class="ya-input ya-input--area"
                rows="3"
                formControlName="content"
                placeholder="Optional blurb shown on the website"
              ></textarea>
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="faq_content">FAQ content</label>
              <textarea
                id="faq_content"
                class="ya-input ya-input--area"
                rows="4"
                formControlName="faq_content"
                placeholder="Optional route-specific FAQ text"
              ></textarea>
            </div>
          </div>

          @if (error()) {
            <p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
          }

          <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/routes">Cancel</a>
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving() || uploading()">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create route' }}
            </button>
          </div>
        </form>
      </div>

      @if (cropSrc()) {
        <app-ya-image-cropper
          [src]="cropSrc()!"
          (applyCrop)="onCropApplied($event)"
          (cancel)="closeCropper()"
        />
      }
    </div>
  `,
})
export class RouteFormPage implements OnInit {
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
  readonly cities = signal<CityOpt[]>([]);
  readonly cropSrc = signal<string | null>(null);
  private routeId: string | null = null;
  private cropObjectUrl: string | null = null;
  slugTouched = false;
  titleTouched = false;

  readonly boolOpts: FieldOpt[] = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  previewImage(): string {
    return mediaUrl(this.form.controls.image_url.value) ?? '';
  }

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(180)]),
    pickup_city_id: this.fb.nonNullable.control('', [Validators.required]),
    drop_city_id: this.fb.nonNullable.control('', [Validators.required]),
    slug: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(180)]),
    distance_km: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    amount: this.fb.control<number | null>(null),
    duration_minutes: this.fb.control<number | null>(null),
    image_url: this.fb.nonNullable.control(''),
    content: this.fb.nonNullable.control(''),
    faq_content: this.fb.nonNullable.control(''),
    is_popular: this.fb.nonNullable.control(true),
    is_active: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    this.loadCities();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.routeId = id;
      this.slugTouched = true;
      this.titleTouched = true;
      this.load(id);
    }
  }

  onTitleInput(): void {
    this.titleTouched = true;
    if (this.slugTouched) return;
    const title = this.form.controls.title.value;
    this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
  }

  onCitiesChanged(): void {
    const pickup = this.cities().find((c) => c.id === this.form.controls.pickup_city_id.value);
    const drop = this.cities().find((c) => c.id === this.form.controls.drop_city_id.value);
    if (!pickup || !drop) return;
    const autoTitle = `${pickup.name} to ${drop.name} Cabs`;
    if (!this.titleTouched || !this.form.controls.title.value.trim()) {
      this.form.controls.title.setValue(autoTitle, { emitEvent: false });
    }
    if (!this.slugTouched) {
      this.form.controls.slug.setValue(slugify(`${pickup.name}-to-${drop.name}`), { emitEvent: false });
    }
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
    this.error.set(null);
    this.closeCropper();
    this.cropObjectUrl = URL.createObjectURL(file);
    this.cropSrc.set(this.cropObjectUrl);
  }

  onCropApplied(blob: Blob): void {
    this.closeCropper();
    const body = new FormData();
    body.append('file', blob, `route-card-${Date.now()}.jpg`);
    this.uploading.set(true);
    this.error.set(null);
    this.api.upload('/uploads', body).subscribe({
      next: (res) => {
        this.uploading.set(false);
        const data = res.data as { url?: string; path?: string } | undefined;
        const stored = data?.path || data?.url;
        if (stored) this.form.controls.image_url.setValue(stored);
        this.snack.open('Image uploaded', 'OK', { duration: 2000 });
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Image upload failed');
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

  clearImage(): void {
    this.form.controls.image_url.setValue('');
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  errorText(name: keyof typeof this.form.controls): string {
    const c = this.form.controls[name];
    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('minlength')) {
      const min = c.getError('minlength')?.requiredLength;
      return `Must be at least ${min} characters.`;
    }
    if (c.hasError('maxlength')) return 'Value is too long.';
    if (c.hasError('min')) return 'Must be zero or greater.';
    return 'Invalid value.';
  }

  private loadCities(): void {
    this.api.list('/cities').subscribe({
      next: (res) => {
        const rows = Array.isArray(res.data) ? (res.data as CityOpt[]) : [];
        this.cities.set(rows.map((c) => ({ id: String(c.id), name: c.name })));
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load cities');
      },
    });
  }

  private load(id: string): void {
    this.api.get(`/routes/${id}`).subscribe({
      next: (res) => {
        const d = (res.data || {}) as Record<string, unknown>;
        this.form.patchValue({
          title: String(d['title'] ?? ''),
          pickup_city_id: String(d['pickup_city_id'] ?? ''),
          drop_city_id: String(d['drop_city_id'] ?? ''),
          slug: String(d['slug'] ?? ''),
          distance_km: Number(d['distance_km'] ?? 0),
          amount: d['amount'] != null ? Number(d['amount']) : null,
          duration_minutes: d['duration_minutes'] != null ? Number(d['duration_minutes']) : null,
          image_url: String(d['image_url'] ?? ''),
          content: String(d['content'] ?? ''),
          faq_content: String(d['faq_content'] ?? ''),
          is_popular: Boolean(d['is_popular']),
          is_active: d['is_active'] !== false,
        });
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load route');
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
    const raw = this.form.getRawValue();
    if (raw.pickup_city_id === raw.drop_city_id) {
      this.error.set('Pickup and drop cities must be different.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const body: Record<string, unknown> = {
      title: raw.title.trim(),
      pickup_city_id: raw.pickup_city_id,
      drop_city_id: raw.drop_city_id,
      slug: raw.slug.trim(),
      distance_km: Number(raw.distance_km),
      amount:
        raw.amount == null || Number.isNaN(Number(raw.amount)) ? null : Number(raw.amount),
      duration_minutes:
        raw.duration_minutes == null || Number.isNaN(Number(raw.duration_minutes))
          ? null
          : Number(raw.duration_minutes),
      image_url: raw.image_url.trim() || null,
      content: raw.content.trim() || null,
      faq_content: raw.faq_content.trim() || null,
      is_popular: raw.is_popular,
      is_active: raw.is_active,
    };

    const req$ = this.isEdit()
      ? this.api.update(`/routes/${this.routeId}`, body)
      : this.api.create('/routes', body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Route updated' : 'Route created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/routes');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(err instanceof Error ? err.message : 'Save failed');
      },
    });
  }
}
