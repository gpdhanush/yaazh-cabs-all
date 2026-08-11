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

const TYPES = [
  { label: 'General', value: 'general' },
  { label: 'Route', value: 'route' },
  { label: 'Service', value: 'service' },
];

@Component({
  selector: 'app-faq-form-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-wrap space-y-5">
      <a routerLink="/faqs" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to FAQs
      </a>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? 'Edit FAQ' : 'Add FAQ' }}</h2>
            <p class="page-subtitle">Shown on the website FAQ section. Keep answers short and clear.</p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="question">Question <span class="ya-req">*</span></label>
              <input
                id="question"
                class="ya-input"
                [class.ya-input--error]="showError('question')"
                formControlName="question"
                placeholder="e.g. How do I book a cab?"
              />
              @if (showError('question')) {
                <p class="ya-error">Question is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="answer">Answer <span class="ya-req">*</span></label>
              <textarea
                id="answer"
                class="ya-input ya-input--area"
                rows="5"
                [class.ya-input--error]="showError('answer')"
                formControlName="answer"
                placeholder="Write the answer customers should see"
              ></textarea>
              @if (showError('answer')) {
                <p class="ya-error">Answer is required</p>
              }
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="related_type">Type</label>
              <select id="related_type" class="ya-input" formControlName="related_type">
                @for (t of types; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="display_order">Display order</label>
              <input
                id="display_order"
                class="ya-input"
                type="text"
                inputmode="numeric"
                maxlength="4"
                formControlName="display_order"
                (input)="onOrderInput($event)"
                placeholder="0"
              />
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
              {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create FAQ' }}
            </button>
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/faqs">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class FaqFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly types = TYPES;
  readonly yesNo = YES_NO;
  private faqId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    question: ['', Validators.required],
    answer: ['', Validators.required],
    related_type: ['general'],
    display_order: ['0'],
    is_active: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.faqId = id;
    this.isEdit.set(Boolean(id));
    if (!id) return;
    this.api.get(`/faqs/${id}`).subscribe({
      next: (res) => {
        const f = (res.data || {}) as Record<string, unknown>;
        this.form.patchValue({
          question: String(f['question'] ?? ''),
          answer: String(f['answer'] ?? ''),
          related_type: String(f['related_type'] ?? 'general'),
          display_order: String(f['display_order'] ?? '0'),
          is_active: Boolean(f['is_active'] ?? true),
        });
      },
      error: (err: unknown) =>
        this.snack.open(err instanceof Error ? err.message : 'Failed to load FAQ', 'Close'),
    });
  }

  onOrderInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const next = el.value.replace(/\D/g, '').slice(0, 4);
    el.value = next;
    this.form.controls.display_order.setValue(next, { emitEvent: false });
  }

  showError(control: string): boolean {
    const c = this.form.get(control);
    return Boolean(c && c.invalid && (c.dirty || c.touched));
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const body = {
      question: v.question.trim(),
      answer: v.answer.trim(),
      related_type: v.related_type,
      display_order: Number(v.display_order || 0),
      is_active: v.is_active,
    };
    this.saving.set(true);
    const req$ =
      this.isEdit() && this.faqId ? this.api.update(`/faqs/${this.faqId}`, body) : this.api.create('/faqs', body);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'FAQ updated' : 'FAQ created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/faqs');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Save failed', 'Close');
      },
    });
  }
}
