import { DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../core/api/admin-api.service';
import { Booking, DashboardStats, LiveTrackingTrip } from '../../core/api/api.types';
import { DEFAULT_DRIVER_IMAGE, driverPhotoUrl } from '../../core/api/media-url';
import { statusLabel, statusTone } from '../../shared/status-chip';

type LeafletMap = {
  setView: (latlng: [number, number], zoom?: number) => LeafletMap;
  fitBounds: (bounds: Array<[number, number]>, opts?: object) => void;
  remove: () => void;
  invalidateSize: () => void;
};
type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => LeafletMarker;
  setIcon: (icon: unknown) => LeafletMarker;
  bindPopup: (html: string) => LeafletMarker;
  on: (event: string, fn: () => void) => LeafletMarker;
  addTo: (map: LeafletMap) => LeafletMarker;
  remove: () => void;
};
type LeafletLayer = { addTo: (map: LeafletMap) => LeafletLayer; remove: () => void };
type LeafletNS = {
  map: (el: HTMLElement, opts?: object) => LeafletMap;
  tileLayer: (url: string, opts?: object) => LeafletLayer;
  marker: (latlng: [number, number], opts?: object) => LeafletMarker;
  polyline: (latlngs: Array<[number, number]>, opts?: object) => LeafletLayer;
  divIcon: (opts: object) => unknown;
  circleMarker: (latlng: [number, number], opts?: object) => LeafletMarker;
};

function leaflet(): LeafletNS | null {
  const L = (window as unknown as { L?: LeafletNS }).L;
  return L ?? null;
}

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
              <span class="live-track__badge is-live">Live</span>
            </div>
            <p class="dash-chart__sub">
              {{ liveTrips().length }} active trip{{ liveTrips().length === 1 ? '' : 's' }}
              · driver GPS every {{ tickSec }}s
            </p>
          </div>
          <div class="live-track__meta">
            <span class="live-track__clock">Updated {{ liveTick() | date: 'HH:mm:ss' }}</span>
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="refreshLive()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>
        </div>

        <div class="live-track__grid">
          <div class="live-map" aria-label="Live map of on-ride trips">
            <div #liveMapEl class="live-map__canvas"></div>
            @if (!liveTrips().length) {
              <div class="live-map__empty">
                <mat-icon>explore_off</mat-icon>
                <p>No drivers on a live trip right now.</p>
                <span>Pins appear when a driver is assigned and sharing GPS.</span>
              </div>
            }
          </div>

          <div class="live-trip-list">
            @if (!liveTrips().length) {
              <div class="live-trip-empty">Waiting for an on-ride booking…</div>
            }
            @for (trip of liveTrips(); track trip.id) {
              <article
                class="live-trip"
                [class.is-active]="selectedLiveId() === trip.id"
                (click)="selectLive(trip.id)"
              >
                <div class="live-trip__top">
                  <div class="min-w-0">
                    <p class="live-trip__ref">{{ trip.booking_reference }}</p>
                    <p class="live-trip__route">{{ trip.pickup_location }} → {{ trip.drop_location }}</p>
                  </div>
                  <span class="chip" [class]="statusClass(trip.status)">{{ label(trip.status) }}</span>
                </div>
                <div class="live-trip__meta">
                  <span><mat-icon>person</mat-icon>{{ trip.customer_name }}</span>
                  <span>
                    @if (trip.driver && driverPhoto(trip.driver); as src) {
                      <img class="live-trip__face" [src]="src" [alt]="trip.driver.name" (error)="useDefaultDriverImage($event)" />
                    } @else {
                      <mat-icon>badge</mat-icon>
                    }
                    {{ trip.driver?.name || 'Unassigned' }}
                  </span>
                  <span>
                    <mat-icon>directions_car</mat-icon>
                    {{ trip.vehicle?.registration || trip.vehicle?.name || 'Cab' }}
                  </span>
                </div>
                <div class="live-trip__progress">
                  <div class="live-trip__bar">
                    <span [style.width.%]="trip.progress"></span>
                  </div>
                  <div class="live-trip__stats">
                    <span>{{ trip.progress | number: '1.0-0' }}% done</span>
                    <span>{{ trip.eta_min ? 'ETA ' + trip.eta_min + ' min' : 'ETA —' }}</span>
                    <span>
                      {{ trip.location?.speed_kmph != null ? (trip.location!.speed_kmph | number: '1.0-0') + ' km/h' : '—' }}
                    </span>
                  </div>
                </div>
                <p class="live-trip__coords">
                  @if (trip.location) {
                    {{ trip.location.latitude | number: '1.4-4' }},
                    {{ trip.location.longitude | number: '1.4-4' }}
                    @if (trip.location.stale) {
                      <span class="live-stale">GPS stale</span>
                    }
                  } @else {
                    Waiting for driver GPS
                  }
                </p>
                <a class="live-trip__open" [routerLink]="['/bookings', trip.id]" (click)="$event.stopPropagation()">
                  Open booking
                </a>
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
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly zone = inject(NgZone);
  private liveTimer: ReturnType<typeof setInterval> | null = null;
  private map: LeafletMap | null = null;
  private markers = new Map<string, LeafletMarker>();
  private stopMarkers: LeafletMarker[] = [];
  private routeLine: LeafletLayer | null = null;

  @ViewChild('liveMapEl') liveMapEl?: ElementRef<HTMLElement>;

  readonly tickSec = 8;
  readonly stats = signal<DashboardStats | null>(null);
  readonly recent = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly loadedAt = signal<Date>(new Date());
  readonly liveTrips = signal<LiveTrackingTrip[]>([]);
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

  driverPhoto(d: { id: string; photo_url?: string | null }): string | null {
    return driverPhotoUrl(d) ?? DEFAULT_DRIVER_IMAGE;
  }

  useDefaultDriverImage(event: Event): void {
    const image = event.currentTarget as HTMLImageElement;
    image.onerror = null;
    image.src = DEFAULT_DRIVER_IMAGE;
  }

  ngOnInit(): void {
    this.reload();
    this.refreshLive();
    this.startLiveTicker();
  }

  ngAfterViewInit(): void {
    this.ensureMap();
    queueMicrotask(() => this.syncMap());
  }

  ngOnDestroy(): void {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
    this.map?.remove();
    this.map = null;
  }

  selectLive(id: string): void {
    this.selectedLiveId.set(id);
    this.syncMap(true);
  }

  refreshLive(): void {
    this.api.liveTracking().subscribe({
      next: (trips) => {
        this.liveTrips.set(trips);
        this.liveTick.set(new Date());
        const selected = this.selectedLiveId();
        if (!selected || !trips.some((t) => t.id === selected)) {
          this.selectedLiveId.set(trips[0]?.id ?? null);
        }
        this.syncMap();
      },
      error: () => {
        this.liveTick.set(new Date());
      },
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      stats: this.api.dashboard(),
      bookings: this.api.listBookings({ page: 1, per_page: 7 }),
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
    this.liveTimer = setInterval(() => this.refreshLive(), this.tickSec * 1000);
  }

  private ensureMap(): void {
    const L = leaflet();
    const el = this.liveMapEl?.nativeElement;
    if (!L || !el || this.map) return;
    this.map = L.map(el, { zoomControl: true, attributionControl: true }).setView([10.5847, 77.2514], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 80);
  }

  private syncMap(focusSelected = false): void {
    this.ensureMap();
    const L = leaflet();
    const map = this.map;
    if (!L || !map) return;

    const trips = this.liveTrips();
    const selectedId = this.selectedLiveId();
    const seen = new Set<string>();

    for (const trip of trips) {
      const loc = trip.location;
      if (!loc) continue;
      seen.add(trip.id);
      const latlng: [number, number] = [loc.latitude, loc.longitude];
      const icon = L.divIcon({
        className: `live-pin live-pin--${trip.status} ${selectedId === trip.id ? 'is-active' : ''}`,
        html: `<span class="live-pin__ring"></span><span class="live-pin__dot">🚕</span><span class="live-pin__tag">${trip.booking_reference.slice(-4)}</span>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
      const existing = this.markers.get(trip.id);
      if (existing) {
        existing.setLatLng(latlng).setIcon(icon);
      } else {
        const marker = L.marker(latlng, { icon })
          .addTo(map)
          .bindPopup(`${trip.booking_reference}<br>${trip.driver?.name ?? 'Driver'}`)
          .on('click', () => this.zone.run(() => this.selectLive(trip.id)));
        this.markers.set(trip.id, marker);
      }
    }

    for (const [id, marker] of this.markers) {
      if (!seen.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }

    this.routeLine?.remove();
    this.routeLine = null;
    for (const stop of this.stopMarkers) stop.remove();
    this.stopMarkers = [];

    const selected = trips.find((t) => t.id === selectedId);
    const points: Array<[number, number]> = [];
    if (selected?.pickup_latitude != null && selected.pickup_longitude != null) {
      const pickup: [number, number] = [selected.pickup_latitude, selected.pickup_longitude];
      points.push(pickup);
      this.stopMarkers.push(
        L.circleMarker(pickup, {
          radius: 6,
          color: '#16a34a',
          weight: 2,
          fillColor: '#fff',
          fillOpacity: 1,
        }).addTo(map),
      );
    }
    if (selected?.location) {
      points.push([selected.location.latitude, selected.location.longitude]);
    }
    if (selected?.drop_latitude != null && selected.drop_longitude != null) {
      const drop: [number, number] = [selected.drop_latitude, selected.drop_longitude];
      points.push(drop);
      this.stopMarkers.push(
        L.circleMarker(drop, {
          radius: 6,
          color: '#ef4444',
          weight: 2,
          fillColor: '#fff',
          fillOpacity: 1,
        }).addTo(map),
      );
    }
    if (points.length >= 2) {
      this.routeLine = L.polyline(points, {
        color: '#14213d',
        weight: 3,
        opacity: 0.7,
        dashArray: '8 6',
      }).addTo(map);
    }

    const fitPoints = trips
      .map((t) => (t.location ? ([t.location.latitude, t.location.longitude] as [number, number]) : null))
      .filter((p): p is [number, number] => p != null);
    if (focusSelected && selected?.location) {
      map.setView([selected.location.latitude, selected.location.longitude], 14);
    } else if (fitPoints.length > 1) {
      map.fitBounds(fitPoints, { padding: [36, 36], maxZoom: 14 });
    } else if (fitPoints.length === 1) {
      map.setView(fitPoints[0], 13);
    }
    map.invalidateSize();
  }
}
