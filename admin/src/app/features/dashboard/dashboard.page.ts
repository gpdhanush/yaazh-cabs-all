import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../core/api/admin-api.service';
import { Booking, DashboardStats } from '../../core/api/api.types';
import { statusLabel, statusTone } from '../../shared/status-chip';

type LiveTrip = {
  id: string;
  ref: string;
  customer: string;
  driver: string;
  vehicle: string;
  pickup: string;
  drop: string;
  status: 'on_the_way' | 'arrived' | 'trip_started';
  progress: number;
  etaMin: number;
  speedKmh: number;
  lat: number;
  lng: number;
  /** Map pin position as % of the sample map canvas */
  x: number;
  y: number;
};

type DashCard = {
  label: string;
  value: string | number;
  hint: string;
  icon: string;
  theme: string;
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-wrap space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="page-title">Dashboard</h2>
          <p class="page-subtitle">Welcome back — live snapshot from Yaazh booking ops.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a mat-flat-button class="ya-btn-primary" routerLink="/bookings">
            <mat-icon>local_taxi</mat-icon>
            All bookings
          </a>
        </div>
      </div>

      @if (error()) {
        <p class="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{{ error() }}</p>
      }

      @if (loading()) {
        <div class="dash-kpi-grid">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="skeleton h-32 rounded-2xl"></div>
          }
        </div>
      } @else {
        <div class="dash-kpi-grid">
          @for (card of cards(); track card.label) {
            <article class="dash-kpi" [attr.data-theme]="card.theme">
              <div class="dash-kpi__body">
                <p class="dash-kpi__label">{{ card.label }}</p>
                <p class="dash-kpi__value">{{ card.value }}</p>
                <p class="dash-kpi__hint">{{ card.hint }}</p>
              </div>
              <div class="dash-kpi__visual" aria-hidden="true">
                <mat-icon class="dash-kpi__watermark">{{ card.icon }}</mat-icon>
                <span class="dash-kpi__badge">
                  <mat-icon>{{ card.icon }}</mat-icon>
                </span>
              </div>
            </article>
          }
        </div>
      }

      <section class="ya-page-card live-track overflow-hidden">
        <div class="live-track__head">
          <div class="min-w-0">
            <div class="live-track__title-row">
              <span class="live-track__pulse" aria-hidden="true"></span>
              <h3 class="dash-chart__title">Live on-ride tracking</h3>
              <span class="live-track__badge">Sample data</span>
            </div>
            <p class="dash-chart__sub">
              {{ liveTrips().length }} active trips · updates every {{ tickSec }}s · Udumalpet corridor demo
            </p>
          </div>
          <div class="live-track__meta">
            <span class="live-track__clock">Tick {{ liveTick() | date: 'HH:mm:ss' }}</span>
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="resetLiveSample()">
              <mat-icon>restart_alt</mat-icon>
              Reset sample
            </button>
          </div>
        </div>

        <div class="live-track__grid">
          <div class="live-map" aria-label="Sample live map of on-ride trips">
            <div class="live-map__gridlines" aria-hidden="true"></div>
            <div class="live-map__label live-map__label--nw">Coimbatore</div>
            <div class="live-map__label live-map__label--sw">Pollachi</div>
            <div class="live-map__label live-map__label--se">Udumalpet</div>
            <div class="live-map__road live-map__road--a" aria-hidden="true"></div>
            <div class="live-map__road live-map__road--b" aria-hidden="true"></div>

            @for (trip of liveTrips(); track trip.id) {
              <button
                type="button"
                class="live-pin"
                [class.is-active]="selectedLiveId() === trip.id"
                [class.live-pin--on_the_way]="trip.status === 'on_the_way'"
                [class.live-pin--arrived]="trip.status === 'arrived'"
                [class.live-pin--trip_started]="trip.status === 'trip_started'"
                [style.left.%]="trip.x"
                [style.top.%]="trip.y"
                [attr.title]="trip.ref + ' · ' + label(trip.status)"
                (click)="selectLive(trip.id)"
              >
                <span class="live-pin__ring"></span>
                <span class="live-pin__dot">
                  <mat-icon>local_taxi</mat-icon>
                </span>
                <span class="live-pin__tag">{{ trip.ref.slice(-4) }}</span>
              </button>
            }
          </div>

          <div class="live-trip-list">
            @for (trip of liveTrips(); track trip.id) {
              <article
                class="live-trip"
                [class.is-active]="selectedLiveId() === trip.id"
                (click)="selectLive(trip.id)"
              >
                <div class="live-trip__top">
                  <div class="min-w-0">
                    <p class="live-trip__ref">{{ trip.ref }}</p>
                    <p class="live-trip__route">{{ trip.pickup }} → {{ trip.drop }}</p>
                  </div>
                  <span class="chip" [class]="statusClass(trip.status)">{{ label(trip.status) }}</span>
                </div>
                <div class="live-trip__meta">
                  <span><mat-icon>person</mat-icon>{{ trip.customer }}</span>
                  <span><mat-icon>badge</mat-icon>{{ trip.driver }}</span>
                  <span><mat-icon>directions_car</mat-icon>{{ trip.vehicle }}</span>
                </div>
                <div class="live-trip__progress">
                  <div class="live-trip__bar">
                    <span [style.width.%]="trip.progress"></span>
                  </div>
                  <div class="live-trip__stats">
                    <span>{{ trip.progress | number: '1.0-0' }}% done</span>
                    <span>ETA {{ trip.etaMin }} min</span>
                    <span>{{ trip.speedKmh }} km/h</span>
                  </div>
                </div>
                <p class="live-trip__coords">
                  {{ trip.lat | number: '1.4-4' }}, {{ trip.lng | number: '1.4-4' }}
                </p>
              </article>
            }
          </div>
        </div>
      </section>

      <div class="grid gap-4 xl:grid-cols-3">
        <div class="ya-page-card overflow-hidden xl:col-span-2">
          <div class="flex items-center justify-between border-b px-4 py-3" style="border-color: var(--ya-border)">
            <div>
              <h3 class="dash-chart__title">Recent bookings</h3>
              <p class="dash-chart__sub">Latest trips from the API</p>
            </div>
            <a mat-button routerLink="/bookings">View all</a>
          </div>
          @if (!recent().length) {
            <div class="empty-state">
              <mat-icon class="mb-2 !text-4xl opacity-40">inbox</mat-icon>
              <p>No bookings yet. New trips will appear here.</p>
            </div>
          } @else {
            <div class="divide-y" style="border-color: var(--ya-border)">
              @for (b of recent(); track b.id) {
                <a
                  class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-black/[0.03]"
                  [routerLink]="['/bookings', b.id]"
                >
                  <div class="min-w-0">
                    <p class="font-semibold">{{ b.booking_reference }}</p>
                    <p class="truncate text-sm" style="color: var(--ya-muted)">
                      {{ b.pickup_location }} → {{ b.drop_location }}
                    </p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="chip" [class]="statusClass(b.status)">{{ label(b.status) }}</span>
                    <span class="text-sm font-medium">₹{{ b.estimated_total }}</span>
                  </div>
                </a>
              }
            </div>
          }
        </div>

        <div class="ya-page-card p-4">
          <h3 class="dash-chart__title">Quick actions</h3>
          <p class="dash-chart__sub mb-4">Jump into high-frequency ops</p>
          <div class="grid gap-2">
            @for (action of quickActions; track action.path) {
              <a class="dash-action" [routerLink]="action.path" [queryParams]="action.query || null">
                <span class="dash-action__icon" [attr.data-theme]="action.theme">
                  <mat-icon>{{ action.icon }}</mat-icon>
                </span>
                <span>
                  <span class="block text-sm font-semibold">{{ action.label }}</span>
                  <span class="text-xs" style="color: var(--ya-muted)">{{ action.hint }}</span>
                </span>
              </a>
            }
          </div>
          <p class="mt-4 text-xs" style="color: var(--ya-muted)">
            Updated {{ loadedAt() | date: 'mediumTime' }}
          </p>
        </div>
      </div>
    </div>
  `,
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  private liveTimer: ReturnType<typeof setInterval> | null = null;

  readonly tickSec = 3;
  readonly stats = signal<DashboardStats | null>(null);
  readonly recent = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly loadedAt = signal<Date>(new Date());
  readonly liveTrips = signal<LiveTrip[]>([]);
  readonly selectedLiveId = signal<string | null>(null);
  readonly liveTick = signal<Date>(new Date());

  readonly quickActions = [
    {
      label: 'Pending bookings',
      hint: 'Confirm or cancel queue',
      path: '/bookings',
      query: { status: 'pending' },
      icon: 'hourglass_top',
      theme: 'amber',
    },
    {
      label: 'Approve drivers',
      hint: 'Verification workflow',
      path: '/drivers',
      icon: 'verified',
      theme: 'green',
    },
    {
      label: 'Edit FAQs',
      hint: 'Website help content',
      path: '/faqs',
      icon: 'help',
      theme: 'violet',
    },
    {
      label: 'Contact enquiries',
      hint: 'Website contact form',
      path: '/enquiries',
      icon: 'mail',
      theme: 'cyan',
    },
  ];

  readonly cards = (): DashCard[] => {
    const s = this.stats();
    return [
      {
        label: 'Total bookings',
        value: s?.total_bookings ?? '—',
        hint: 'All time',
        icon: 'confirmation_number',
        theme: 'blue',
      },
      {
        label: 'Pending',
        value: s?.pending_bookings ?? '—',
        hint: 'Needs action',
        icon: 'pending',
        theme: 'amber',
      },
      {
        label: 'Today',
        value: s?.bookings_today ?? '—',
        hint: 'Created today',
        icon: 'today',
        theme: 'cyan',
      },
      {
        label: 'Active drivers',
        value: s?.active_drivers ?? '—',
        hint: 'Fleet ready',
        icon: 'badge',
        theme: 'green',
      },
      {
        label: 'Customers',
        value: s?.customers ?? '—',
        hint: 'Active accounts',
        icon: 'groups',
        theme: 'violet',
      },
      {
        label: 'Enquiries',
        value: s?.enquiries ?? '—',
        hint: 'Contact form',
        icon: 'forum',
        theme: 'pink',
      },
    ];
  };

  statusClass = statusTone;
  label = statusLabel;

  ngOnInit(): void {
    this.resetLiveSample();
    this.startLiveTicker();
    this.reload();
  }

  ngOnDestroy(): void {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
  }

  selectLive(id: string): void {
    this.selectedLiveId.set(id);
  }

  resetLiveSample(): void {
    const sample = this.buildSampleTrips();
    this.liveTrips.set(sample);
    this.selectedLiveId.set(sample[0]?.id ?? null);
    this.liveTick.set(new Date());
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      stats: this.api.dashboard(),
      bookings: this.api.listBookings({ page: 1, per_page: 8 }),
    }).subscribe({
      next: ({ stats, bookings }) => {
        this.stats.set(stats);
        this.recent.set(bookings.data);
        this.loadedAt.set(new Date());
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Failed to load dashboard');
      },
    });
  }

  private startLiveTicker(): void {
    if (this.liveTimer) clearInterval(this.liveTimer);
    this.liveTimer = setInterval(() => this.tickLiveTrips(), this.tickSec * 1000);
  }

  private tickLiveTrips(): void {
    this.liveTick.set(new Date());
    this.liveTrips.update((trips) =>
      trips.map((trip, index) => {
        const drift = 0.6 + (index % 3) * 0.35;
        let progress = Math.min(99, trip.progress + drift);
        let status = trip.status;
        let etaMin = Math.max(1, trip.etaMin - (index % 2 === 0 ? 1 : 0));
        let speedKmh = Math.max(18, Math.min(72, trip.speedKmh + (Math.random() * 6 - 3)));
        let x = Math.min(92, Math.max(8, trip.x + (Math.random() * 1.6 - 0.4)));
        let y = Math.min(88, Math.max(12, trip.y + (Math.random() * 1.4 - 0.5)));
        let lat = trip.lat + (Math.random() * 0.004 - 0.0015);
        let lng = trip.lng + (Math.random() * 0.004 - 0.0015);

        if (progress >= 92 && status === 'on_the_way') status = 'arrived';
        if (progress >= 96 && status === 'arrived') status = 'trip_started';
        if (progress >= 99) {
          // loop sample trip so the panel stays populated
          const fresh = this.buildSampleTrips()[index % 4];
          return { ...fresh, id: trip.id };
        }

        return {
          ...trip,
          progress: Math.round(progress * 10) / 10,
          status,
          etaMin,
          speedKmh: Math.round(speedKmh),
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          lat: Math.round(lat * 10000) / 10000,
          lng: Math.round(lng * 10000) / 10000,
        };
      }),
    );
  }

  private buildSampleTrips(): LiveTrip[] {
    return [
      {
        id: 'live-1',
        ref: 'YZ-LIVE-2401',
        customer: 'Arun Kumar',
        driver: 'Suresh Babu',
        vehicle: 'TN 39 AB 2145 · Etios',
        pickup: 'Udumalpet Bus Stand',
        drop: 'Coimbatore Airport',
        status: 'trip_started',
        progress: 42,
        etaMin: 38,
        speedKmh: 54,
        lat: 10.6821,
        lng: 77.0914,
        x: 58,
        y: 46,
      },
      {
        id: 'live-2',
        ref: 'YZ-LIVE-2402',
        customer: 'Priya Devi',
        driver: 'Karthik Raja',
        vehicle: 'TN 37 CD 8891 · Innova',
        pickup: 'Pollachi Market',
        drop: 'Tiruppur New Bus Stand',
        status: 'on_the_way',
        progress: 18,
        etaMin: 12,
        speedKmh: 36,
        lat: 10.6612,
        lng: 77.0188,
        x: 28,
        y: 68,
      },
      {
        id: 'live-3',
        ref: 'YZ-LIVE-2403',
        customer: 'Meena Lakshmi',
        driver: 'Gokul Krishnan',
        vehicle: 'TN 41 EF 5520 · Dzire',
        pickup: 'Udumalpet Railway',
        drop: 'Palani Temple',
        status: 'arrived',
        progress: 8,
        etaMin: 2,
        speedKmh: 0,
        lat: 10.5848,
        lng: 77.2489,
        x: 78,
        y: 72,
      },
      {
        id: 'live-4',
        ref: 'YZ-LIVE-2404',
        customer: 'Vignesh S',
        driver: 'Balaji S',
        vehicle: 'TN 38 GH 1044 · Crysta',
        pickup: 'Coimbatore Gandhipuram',
        drop: 'Udumalpet Bypass',
        status: 'trip_started',
        progress: 67,
        etaMin: 24,
        speedKmh: 61,
        lat: 10.9012,
        lng: 77.0421,
        x: 36,
        y: 28,
      },
    ];
  }
}
