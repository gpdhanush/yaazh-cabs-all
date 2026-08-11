import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  preferred_language: string;
  referral_code: string | null;
  app_status: string;
  app_status_label: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  booking_count?: number;
};

@Component({
  selector: 'app-customer-detail-page',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-wrap space-y-5">
      <a routerLink="/customers" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to customers
      </a>

      @if (customer(); as c) {
        <section class="ya-page-card bk-detail-hero">
          <div class="bk-detail-hero__top">
            <div>
              <p class="kpi-label">Customer</p>
              <h2 class="bk-detail-hero__ref">{{ c.name }}</h2>
              <p class="bk-detail-hero__sub">
                Joined {{ c.created_at | date: 'mediumDate' }}
                @if (c.booking_count != null) {
                  · {{ c.booking_count }} booking{{ c.booking_count === 1 ? '' : 's' }}
                }
              </p>
            </div>
            <span class="chip chip-lg" [class]="statusTone(c.app_status)">{{ c.app_status_label }}</span>
          </div>
        </section>

        <div class="bk-detail-grid">
          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Contact</h3>
            <dl class="bk-kv">
              <div>
                <dt>Phone</dt>
                <dd>{{ c.phone }}</dd>
              </div>
              <div>
                <dt>Alternate phone</dt>
                <dd>{{ c.alternate_phone || '—' }}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{{ c.email || '—' }}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{{ c.city || '—' }}</dd>
              </div>
              <div class="bk-kv--full">
                <dt>Address</dt>
                <dd>{{ c.address || '—' }}</dd>
              </div>
            </dl>
          </section>

          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Account</h3>
            <dl class="bk-kv">
              <div>
                <dt>Language</dt>
                <dd>{{ c.preferred_language | titlecase }}</dd>
              </div>
              <div>
                <dt>Referral code</dt>
                <dd>{{ c.referral_code || '—' }}</dd>
              </div>
              <div>
                <dt>Last login</dt>
                <dd>{{ c.last_login_at ? (c.last_login_at | date: 'medium') : '—' }}</dd>
              </div>
              <div>
                <dt>Active</dt>
                <dd>{{ c.is_active ? 'Yes' : 'No' }}</dd>
              </div>
            </dl>

            <div class="bk-assign-row mt-4">
              <div class="ya-field flex-1 min-w-40">
                <label for="cust-status">Status</label>
                <select id="cust-status" class="ya-field__control" [(ngModel)]="appStatus">
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
              <button
                mat-flat-button
                class="ya-btn-primary bk-btn"
                type="button"
                [disabled]="busy() || appStatus === c.app_status"
                (click)="saveStatus()"
              >
                {{ busy() ? 'Saving…' : 'Update status' }}
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
export class CustomerDetailPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  readonly customer = signal<Customer | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  appStatus = 'active';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
  }

  statusTone(status: string): string {
    if (status === 'active') return 'tone-success';
    if (status === 'blocked') return 'tone-danger';
    return 'tone-muted';
  }

  load(id: string): void {
    this.api.get(`/customers/${id}`).subscribe({
      next: (res) => {
        const c = res.data as Customer;
        this.customer.set(c);
        this.appStatus = c.app_status;
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Not found'),
    });
  }

  saveStatus(): void {
    const c = this.customer();
    if (!c) return;
    this.busy.set(true);
    this.api
      .update(`/customers/${c.id}`, {
        app_status: this.appStatus,
        is_active: this.appStatus === 'active',
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.snack.open('Customer status updated', 'OK', { duration: 2500 });
          this.load(c.id);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.snack.open(err instanceof Error ? err.message : 'Update failed', 'Close');
        },
      });
  }
}
