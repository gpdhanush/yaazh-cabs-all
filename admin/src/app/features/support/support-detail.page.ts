import { JsonPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';

@Component({
  selector: 'app-support-detail-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="page-wrap max-w-3xl space-y-4">
      <a routerLink="/support" class="text-sm font-medium" [style.color]="'var(--ya-primary)'">← Back to tickets</a>
      @if (ticket(); as t) {
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-5 py-4">
            <h2 class="text-xl font-semibold text-slate-900">{{ t['subject'] || 'Ticket #' + t['id'] }}</h2>
            <p class="mt-1 text-sm text-slate-500">Status: {{ t['status'] }}</p>
          </div>
          <div class="space-y-4 p-5">
            <pre class="overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{{ t | json }}</pre>

            <div>
              <h3 class="mb-3 text-sm font-semibold text-slate-800">Messages</h3>
              <ul class="space-y-2">
                @for (m of messages(); track $index) {
                  <li class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p class="font-medium text-slate-800">{{ m['sender_type'] || 'message' }}</p>
                    <p class="text-slate-600">{{ m['message'] || m['body'] }}</p>
                  </li>
                }
              </ul>
            </div>

            <form class="ya-field-grid border-t border-slate-100 pt-4" [formGroup]="form" (ngSubmit)="reply()">
              <div class="ya-field">
                <label for="support-reply">Reply</label>
                <textarea
                  id="support-reply"
                  class="ya-field__control !min-h-28 !items-start"
                  rows="3"
                  formControlName="message"
                  placeholder="Write your reply…"
                ></textarea>
              </div>
              <div class="flex justify-end">
                <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="form.invalid">
                  Send reply
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class SupportDetailPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly ticket = signal<Record<string, unknown> | null>(null);
  readonly messages = signal<Array<Record<string, unknown>>>([]);
  readonly form = this.fb.nonNullable.group({
    message: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  private load(id: string): void {
    this.api.get(`/support/${id}`).subscribe({
      next: (res) => {
        const data = res.data as Record<string, unknown>;
        this.ticket.set(data);
        const msgs = (data['messages'] as Array<Record<string, unknown>>) || [];
        this.messages.set(msgs);
      },
      error: (err: unknown) => this.snack.open(err instanceof Error ? err.message : 'Not found', 'Close'),
    });
  }

  reply(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const message = this.form.controls.message.value;
    this.api.action(`/support/${id}/messages`, { message }).subscribe({
      next: () => {
        this.snack.open('Reply sent', 'OK', { duration: 2000 });
        this.form.reset();
        this.load(id);
      },
      error: (err: unknown) => this.snack.open(err instanceof Error ? err.message : 'Failed', 'Close'),
    });
  }
}
