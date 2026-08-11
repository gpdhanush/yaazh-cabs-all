import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';

type Enquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  status_label: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
};

@Component({
  selector: 'app-enquiry-detail-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-wrap space-y-5">
      <a routerLink="/enquiries" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to enquiries
      </a>

      @if (enquiry(); as e) {
        <section class="ya-page-card bk-detail-hero">
          <div class="bk-detail-hero__top">
            <div>
              <p class="kpi-label">Contact enquiry</p>
              <h2 class="bk-detail-hero__ref">{{ e.subject || 'No subject' }}</h2>
              <p class="bk-detail-hero__sub">Received {{ e.created_at | date: 'medium' }}</p>
            </div>
            <span class="chip chip-lg" [class]="statusTone(e.status)">{{ e.status_label }}</span>
          </div>
        </section>

        <div class="bk-detail-grid">
          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">From</h3>
            <dl class="bk-kv">
              <div>
                <dt>Name</dt>
                <dd>{{ e.name }}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{{ e.phone || '—' }}</dd>
              </div>
              <div class="bk-kv--full">
                <dt>Email</dt>
                <dd>{{ e.email || '—' }}</dd>
              </div>
            </dl>

            <h3 class="bk-panel__title mt-6">Message</h3>
            <p class="bk-panel__hint" style="white-space: pre-wrap; color: var(--ya-text)">{{ e.message }}</p>
          </section>

          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Follow up</h3>
            <p class="bk-panel__hint">Update status and leave an internal note for the team.</p>

            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="enq-status">Status</label>
              <select id="enq-status" class="ya-input" [(ngModel)]="status">
                <option value="new">New</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
                <option value="spam">Spam</option>
              </select>
            </div>

            <div class="ya-field ya-field--stacked mt-3">
              <label class="ya-label" for="enq-note">Admin note</label>
              <textarea
                id="enq-note"
                class="ya-input"
                rows="4"
                [(ngModel)]="adminNote"
                placeholder="Internal note…"
              ></textarea>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button mat-flat-button class="ya-btn-primary" type="button" [disabled]="busy()" (click)="save()">
                {{ busy() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </section>
        </div>
      } @else if (error()) {
        <p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</p>
      } @else {
        <div class="skeleton h-48"></div>
      }
    </div>
  `,
})
export class EnquiryDetailPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  readonly enquiry = signal<Enquiry | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  status = 'new';
  adminNote = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
  }

  statusTone(status: string): string {
    if (status === 'new') return 'tone-warn';
    if (status === 'in_progress') return 'tone-info';
    if (status === 'closed') return 'tone-success';
    return 'tone-muted';
  }

  load(id: string): void {
    this.api.get(`/enquiries/${id}`).subscribe({
      next: (res) => {
        const e = res.data as Enquiry;
        this.enquiry.set(e);
        this.status = e.status;
        this.adminNote = e.admin_note || '';
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Not found'),
    });
  }

  save(): void {
    const e = this.enquiry();
    if (!e) return;
    this.busy.set(true);
    this.api
      .update(`/enquiries/${e.id}`, {
        status: this.status,
        admin_note: this.adminNote.trim() || null,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.snack.open('Enquiry updated', 'OK', { duration: 2500 });
          this.load(e.id);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.snack.open(err instanceof Error ? err.message : 'Update failed', 'Close');
        },
      });
  }
}
