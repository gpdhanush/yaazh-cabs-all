import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';

type BoolOpt = { label: string; value: boolean };

const YES_NO: BoolOpt[] = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ label: String(n), value: n }));

const STATUSES = [
  { label: 'Approved', value: 'approved' },
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
];

@Component({
  selector: 'app-testimonial-form-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-wrap space-y-5">
      <a
        routerLink="/testimonials"
        class="inline-flex items-center gap-1 text-sm font-medium"
        [style.color]="'var(--ya-primary)'"
      >
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to testimonials
      </a>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit testimonial' : 'Add testimonial' }}</h2>
            <p class="page-subtitle">Approved testimonials appear on the website.</p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="customer_name">Customer <span class="ya-req">*</span></label>
              <input
                id="customer_name"
                class="ya-input"
                [class.ya-input--error]="showError('customer_name')"
                formControlName="customer_name"
                placeholder="Customer name"
              />
              @if (showError('customer_name')) {
                <p class="ya-error">Name is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="customer_phone">Phone</label>
              <input
                id="customer_phone"
                class="ya-input"
                type="text"
                inputmode="numeric"
                maxlength="10"
                formControlName="customer_phone"
                (input)="onPhoneInput($event)"
                placeholder="10-digit phone"
              />
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="review">Review <span class="ya-req">*</span></label>
              <textarea
                id="review"
                class="ya-input ya-input--area"
                rows="5"
                [class.ya-input--error]="showError('review')"
                formControlName="review"
                placeholder="Customer review text"
              ></textarea>
              @if (showError('review')) {
                <p class="ya-error">Review is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="rating">Rating</label>
              <select id="rating" class="ya-input" formControlName="rating">
                @for (r of ratings; track r.value) {
                  <option [ngValue]="r.value">{{ r.label }}</option>
                }
              </select>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="approval_status">Status</label>
              <select id="approval_status" class="ya-input" formControlName="approval_status">
                @for (s of statuses; track s.value) {
                  <option [value]="s.value">{{ s.label }}</option>
                }
              </select>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="is_featured">Featured</label>
              <select id="is_featured" class="ya-input" formControlName="is_featured">
                @for (opt of yesNo; track opt.label) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            @if (isEdit()) {
              <div class="ya-field ya-field--stacked ya-field--full">
                <label class="ya-label" for="admin_reply">Admin reply</label>
                <textarea
                  id="admin_reply"
                  class="ya-input ya-input--area"
                  rows="3"
                  formControlName="admin_reply"
                  placeholder="Optional reply"
                ></textarea>
              </div>
            }
          </div>

          <div class="mt-6 flex flex-wrap gap-2">
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create testimonial' }}
            </button>
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/testimonials">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TestimonialFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly ratings = RATINGS;
  readonly statuses = STATUSES;
  readonly yesNo = YES_NO;
  private reviewId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    customer_name: ['', Validators.required],
    customer_phone: [''],
    review: ['', Validators.required],
    rating: this.fb.nonNullable.control(5),
    approval_status: ['approved'],
    is_featured: this.fb.nonNullable.control(true),
    admin_reply: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.reviewId = id;
    this.isEdit.set(Boolean(id));
    if (!id) return;
    this.api.get(`/reviews/${id}`).subscribe({
      next: (res) => {
        const t = (res.data || {}) as Record<string, unknown>;
        this.form.patchValue({
          customer_name: String(t['customer_name'] ?? ''),
          customer_phone: t['customer_phone'] != null ? String(t['customer_phone']) : '',
          review: String(t['review'] ?? ''),
          rating: Number(t['rating'] ?? 5),
          approval_status: String(t['approval_status'] ?? 'pending'),
          is_featured: Boolean(t['is_featured'] ?? false),
          admin_reply: t['admin_reply'] != null ? String(t['admin_reply']) : '',
        });
      },
      error: (err: unknown) =>
        this.snack.open(err instanceof Error ? err.message : 'Failed to load testimonial', 'Close'),
    });
  }

  onPhoneInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const next = el.value.replace(/\D/g, '').slice(0, 10);
    el.value = next;
    this.form.controls.customer_phone.setValue(next, { emitEvent: false });
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
      customer_name: v.customer_name.trim(),
      customer_phone: v.customer_phone.trim() || null,
      review: v.review.trim(),
      rating: Number(v.rating),
      approval_status: v.approval_status,
      is_featured: v.is_featured,
    };
    if (this.isEdit()) body['admin_reply'] = v.admin_reply.trim() || null;

    this.saving.set(true);
    const req$ =
      this.isEdit() && this.reviewId
        ? this.api.update(`/reviews/${this.reviewId}`, body)
        : this.api.create('/reviews', body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Testimonial updated' : 'Testimonial created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/testimonials');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Save failed', 'Close');
      },
    });
  }
}
