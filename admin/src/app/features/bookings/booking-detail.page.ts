import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { Booking, BookingPayment } from '../../core/api/api.types';
import { canAssignDriver, statusLabel, statusTone } from '../../shared/status-chip';

@Component({
  selector: 'app-booking-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    TitleCasePipe,
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-wrap space-y-5">
      <a routerLink="/bookings" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
        <mat-icon class="!text-base">arrow_back</mat-icon>
        Back to bookings
      </a>

      @if (booking(); as b) {
        <section class="bk-detail-hero ya-page-card">
          <div class="bk-detail-hero__top">
            <div>
              <p class="kpi-label">Booking reference</p>
              <h2 class="bk-detail-hero__ref">{{ b.booking_reference }}</h2>
              <p class="bk-detail-hero__sub">
                {{ b.trip_type | titlecase }} · Created {{ (b.created_at || b.pickup_at) | date: 'medium' }}
              </p>
            </div>
            <span class="chip chip-lg" [class]="tone(b.status)">{{ label(b.status) }}</span>
          </div>

          @if (b.status === 'pending') {
            <div class="bk-detail-hero__actions">
              <button mat-flat-button class="ya-btn-primary bk-btn" type="button" [disabled]="busy()" (click)="confirm()">
                Confirm booking
              </button>
              <button mat-stroked-button class="ya-btn-ghost bk-btn" type="button" [disabled]="busy()" (click)="cancel()">
                Cancel
              </button>
            </div>
          }
        </section>

        <div class="bk-detail-grid">
          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Trip</h3>
            <div class="bk-trip-flow">
              <div class="bk-trip-flow__end">
                <div class="bk-trip-flow__label">
                  <span class="bk-dot bk-dot--pickup"></span>
                  <p class="bk-panel__label">Pickup</p>
                </div>
                <p class="bk-panel__value">{{ b.pickup_location }}</p>
              </div>
              <div class="bk-trip-flow__arrow" aria-hidden="true">→</div>
              <div class="bk-trip-flow__end">
                <div class="bk-trip-flow__label">
                  <span class="bk-dot bk-dot--drop"></span>
                  <p class="bk-panel__label">Drop</p>
                </div>
                <p class="bk-panel__value">{{ b.drop_location }}</p>
              </div>
            </div>
            <dl class="bk-kv">
              <div>
                <dt>Pickup time</dt>
                <dd>{{ b.pickup_at | date: 'medium' }}</dd>
              </div>
              <div>
                <dt>Estimated fare</dt>
                <dd>₹{{ b.estimated_total }}</dd>
              </div>
              <div>
                <dt>Final fare</dt>
                <dd>{{ b.final_total ? '₹' + b.final_total : '—' }}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{{ b.payment_status | titlecase }}</dd>
              </div>
              <div>
                <dt>Estimated distance</dt>
                <dd>{{ b.estimated_distance_km != null ? b.estimated_distance_km + ' km' : '—' }}</dd>
              </div>
              <div>
                <dt>Actual trip km</dt>
                <dd>{{ tripKm(b) != null ? tripKm(b) + ' km' : '—' }}</dd>
              </div>
            </dl>
          </section>

          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Customer</h3>
            <dl class="bk-kv">
              <div>
                <dt>Name</dt>
                <dd>{{ b.customer_name }}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{{ b.customer_phone }}</dd>
              </div>
            </dl>

            <h3 class="bk-panel__title mt-6">Assigned driver</h3>
            @if (b.driver; as d) {
              <div class="bk-driver-card">
                <div class="bk-driver-card__avatar">{{ initials(d.name) }}</div>
                <div>
                  <p class="bk-panel__value">{{ d.name }}</p>
                  <p class="bk-panel__label">{{ d.phone }}</p>
                  @if (b.vehicle; as v) {
                    <p class="bk-panel__label mt-1">{{ v.name }} · {{ v.registration || 'No reg.' }}</p>
                  }
                </div>
              </div>
            } @else {
              <p class="bk-panel__label">No driver assigned yet.</p>
            }
          </section>

          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Odometer</h3>
            <p class="bk-panel__hint">
              Driver must enter the meter reading when starting and closing the trip. Difference is the actual trip distance.
            </p>
            <div class="bk-odo">
              <div class="bk-odo__cell">
                <span>Start reading</span>
                <strong>{{ b.start_odometer_km != null ? b.start_odometer_km + ' km' : 'Not recorded' }}</strong>
              </div>
              <div class="bk-odo__cell">
                <span>End reading</span>
                <strong>{{ b.end_odometer_km != null ? b.end_odometer_km + ' km' : 'Not recorded' }}</strong>
              </div>
              <div class="bk-odo__cell bk-odo__cell--diff">
                <span>Difference</span>
                <strong>{{ tripKm(b) != null ? tripKm(b) + ' km' : '—' }}</strong>
              </div>
            </div>
          </section>

          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Assign driver</h3>
            <p class="bk-panel__hint">
              Assigns the driver to this trip and sends them an in-app notification (same channel as customer alerts).
              The driver can close the trip when it is finished.
            </p>
            @if (canAssign(b.status)) {
              <div class="bk-assign-row">
                <div class="ya-field flex-1 min-w-56">
                  <label for="assign-driver">Driver</label>
                  <select id="assign-driver" class="ya-field__control" [(ngModel)]="driverId">
                    <option value="">Select driver</option>
                    @for (d of drivers(); track d.id) {
                      <option [value]="d.id">{{ d.name }} · {{ d.phone }}</option>
                    }
                  </select>
                </div>
                <button
                  mat-flat-button
                  class="ya-btn-primary bk-btn"
                  type="button"
                  [disabled]="!driverId || busy()"
                  (click)="assign()"
                >
                  {{ busy() ? 'Assigning…' : 'Assign driver' }}
                </button>
              </div>
            } @else {
              <p class="bk-panel__hint">
                @if (b.status === 'completed') {
                  Trip is closed. Driver assignment is locked.
                } @else if (b.status === 'cancelled' || b.status === 'rejected') {
                  This booking is closed — cannot assign a driver.
                } @else {
                  Driver already assigned. Trip progress is controlled by the driver app:
                  on the way → arrive → <strong>start (enter odometer)</strong> →
                  <strong>close (enter odometer)</strong>.
                }
              </p>
            }
          </section>

          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Payment</h3>
            <p class="bk-panel__hint">
              Record cash / UPI collected from the customer, or mark the booking paid / unpaid.
            </p>
            <div class="bk-odo">
              <div class="bk-odo__cell">
                <span>Fare due</span>
                <strong>₹{{ pay(b)?.fare_due ?? b.estimated_total }}</strong>
              </div>
              <div class="bk-odo__cell">
                <span>Paid</span>
                <strong>₹{{ pay(b)?.amount_paid ?? 0 }}</strong>
              </div>
              <div class="bk-odo__cell bk-odo__cell--diff">
                <span>Balance</span>
                <strong>₹{{ pay(b)?.balance_due ?? b.estimated_total }}</strong>
              </div>
            </div>

            <div class="bk-assign-row mt-4">
              <div class="ya-field" style="width: 8rem">
                <label for="pay-amount">Amount</label>
                <input
                  id="pay-amount"
                  class="ya-field__control"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  maxlength="5"
                  [ngModel]="payAmount"
                  (ngModelChange)="onPayAmountChange($event)"
                  placeholder="0"
                />
              </div>
              <div class="ya-field" style="width: 8.5rem">
                <label for="pay-method">Method</label>
                <select id="pay-method" class="ya-field__control" [(ngModel)]="payMethod">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="wallet">Wallet</option>
                  <option value="bank_transfer">Bank</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                mat-flat-button
                class="ya-btn-primary bk-btn"
                type="button"
                [disabled]="!payAmountValue() || busy()"
                (click)="recordPayment()"
              >
                Record payment
              </button>
              <button
                mat-stroked-button
                class="ya-btn-ghost bk-btn"
                type="button"
                [disabled]="busy() || (pay(b)?.balance_due ?? 1) <= 0"
                (click)="markPaid()"
              >
                Mark fully paid
              </button>
            </div>

            @if (pay(b)?.payments?.length) {
              <ul class="bk-timeline bk-pay-timeline">
                @for (p of pay(b)!.payments; track p.id) {
                  <li>
                    <span class="bk-timeline__dot"></span>
                    <div>
                      <p class="bk-timeline__status">₹{{ p.amount }} · {{ p.method }}</p>
                      <p class="bk-timeline__time">{{ (p.paid_at || p.created_at) | date: 'medium' }}</p>
                    </div>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="ya-page-card bk-panel">
            <h3 class="bk-panel__title">Status timeline</h3>
            <ol class="bk-timeline">
              @for (h of b.history || []; track h.changed_at + h.new_status) {
                <li>
                  <span class="bk-timeline__dot"></span>
                  <div>
                    <p class="bk-timeline__status">{{ label(h.new_status) }}</p>
                    <p class="bk-timeline__time">{{ h.changed_at | date: 'medium' }}</p>
                    @if (h.note) {
                      <p class="bk-timeline__note">{{ h.note }}</p>
                    }
                  </div>
                </li>
              } @empty {
                <li class="bk-panel__label">No history yet.</li>
              }
            </ol>
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
export class BookingDetailPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  readonly booking = signal<Booking | null>(null);
  readonly drivers = signal<Array<{ id: string; name: string; phone: string }>>([]);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  driverId = '';
  payAmount = '';
  payMethod = 'cash';
  tone = statusTone;
  label = statusLabel;
  canAssign = canAssignDriver;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
    this.api.list('/drivers', { page: 1, per_page: 100 }).subscribe({
      next: (res) => {
        const rows = (Array.isArray(res.data) ? res.data : []) as Array<Record<string, unknown>>;
        this.drivers.set(
          rows.map((d) => ({
            id: String(d['id']),
            name: String(d['name'] ?? 'Driver'),
            phone: String(d['phone'] ?? ''),
          })),
        );
      },
    });
  }

  load(id: string): void {
    this.api.getBooking(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        if (b.assigned_driver_id) this.driverId = b.assigned_driver_id;
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Failed to load booking'),
    });
  }

  onPayAmountChange(value: string): void {
    this.payAmount = String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 5);
  }

  payAmountValue(): number {
    const n = Number(this.payAmount);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('');
  }

  tripKm(b: Booking): number | null {
    if (b.odometer_difference_km != null) return b.odometer_difference_km;
    if (b.actual_distance_km != null) return b.actual_distance_km;
    if (b.start_odometer_km != null && b.end_odometer_km != null) {
      return Math.round((b.end_odometer_km - b.start_odometer_km) * 100) / 100;
    }
    return null;
  }

  pay(b: Booking): BookingPayment | null | undefined {
    return b.payment;
  }

  recordPayment(): void {
    const b = this.booking();
    const amount = this.payAmountValue();
    if (!b || !amount) return;
    this.busy.set(true);
    this.api
      .recordBookingPayment(b.id, {
        amount,
        method: this.payMethod,
        note: 'Recorded by admin',
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.payAmount = '';
          this.snack.open(`Payment recorded · balance ₹${res.balance_due}`, 'OK', { duration: 3000 });
          this.load(b.id);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.snack.open(err instanceof Error ? err.message : 'Payment failed', 'Close');
        },
      });
  }

  markPaid(): void {
    const b = this.booking();
    if (!b) return;
    this.busy.set(true);
    this.api.setBookingPaymentStatus(b.id, { payment_status: 'paid', note: 'Marked paid by admin' }).subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open('Marked as fully paid', 'OK', { duration: 2500 });
        this.load(b.id);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Update failed', 'Close');
      },
    });
  }

  confirm(): void {
    const b = this.booking();
    if (!b) return;
    this.busy.set(true);
    this.api.confirmBooking(b.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open('Booking confirmed — customer notified', 'OK', { duration: 2500 });
        this.load(b.id);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Confirm failed', 'Close');
      },
    });
  }

  cancel(): void {
    const b = this.booking();
    if (!b) return;
    const reason = window.prompt('Cancellation reason?', 'Cancelled by admin') || undefined;
    this.busy.set(true);
    this.api.cancelBooking(b.id, reason).subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open('Booking cancelled', 'OK', { duration: 2500 });
        this.load(b.id);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Cancel failed', 'Close');
      },
    });
  }

  assign(): void {
    const b = this.booking();
    if (!b || !this.driverId) return;
    this.busy.set(true);
    this.api.assignDriver(b.id, { driver_id: this.driverId }).subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open('Driver assigned — driver & customer notified', 'OK', { duration: 3200 });
        this.load(b.id);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Assign failed', 'Close');
      },
    });
  }
}
