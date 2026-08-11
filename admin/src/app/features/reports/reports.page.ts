import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../core/api/admin-api.service';
import { DashboardStats, ReportPeriod, ReportsPayload } from '../../core/api/api.types';
import { statusLabel } from '../../shared/status-chip';

type LineChart = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors: string[];
  legend: ApexLegend;
  markers: ApexMarkers;
};

type DonutOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  colors: string[];
  tooltip: ApexTooltip;
};

type BarOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors: string[];
  plotOptions: ApexPlotOptions;
};

type CountCard = {
  label: string;
  value: string;
  hint: string;
  icon: string;
  theme: string;
};

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [MatSnackBarModule, MatButtonModule, MatIconModule, RouterLink, NgApexchartsModule],
  template: `
    <div class="page-wrap space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="page-title">Reports</h2>
          <p class="page-subtitle">Day, week, and month booking trends with live counts.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="bk-tabs" role="tablist" aria-label="Report period">
            @for (p of periods; track p.id) {
              <button
                type="button"
                class="bk-tab"
                role="tab"
                [class.is-active]="period() === p.id"
                [attr.aria-selected]="period() === p.id"
                (click)="setPeriod(p.id)"
              >
                {{ p.label }}
              </button>
            }
          </div>
          <a mat-stroked-button class="ya-btn-ghost" routerLink="/bookings">Open bookings</a>
        </div>
      </div>

      @if (error()) {
        <p class="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{{ error() }}</p>
      }

      <div class="dash-kpi-grid rpt-kpi-grid">
        @if (loading() && !counts().length) {
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton h-32 rounded-2xl"></div>
          }
        } @else {
          @for (card of counts(); track card.label) {
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
        }
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <div class="ya-page-card dash-chart xl:col-span-2">
          <div class="dash-chart__head flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="dash-chart__title">{{ periodTitle() }} trend</h3>
              <p class="dash-chart__sub">Bookings vs completed · animated line chart</p>
            </div>
            @if (loading()) {
              <span class="text-xs" style="color: var(--ya-muted)">Updating…</span>
            }
          </div>
          @if (line().series.length) {
            <apx-chart
              [series]="line().series"
              [chart]="line().chart"
              [xaxis]="line().xaxis"
              [yaxis]="line().yaxis"
              [dataLabels]="line().dataLabels"
              [stroke]="line().stroke"
              [fill]="line().fill"
              [tooltip]="line().tooltip"
              [colors]="line().colors"
              [grid]="line().grid"
              [legend]="line().legend"
              [markers]="line().markers"
            />
          } @else if (!loading()) {
            <div class="empty-state">No booking activity in this period.</div>
          }
        </div>

        <div class="ya-page-card dash-chart">
          <div class="dash-chart__head">
            <h3 class="dash-chart__title">Status mix</h3>
            <p class="dash-chart__sub">All-time booking counts</p>
          </div>
          <div class="rpt-status-list">
            @for (row of statusRows(); track row.status) {
              <div class="rpt-status-row">
                <span class="rpt-status-row__label">{{ label(row.status) }}</span>
                <span class="rpt-status-row__count">{{ row.count }}</span>
              </div>
            } @empty {
              <div class="empty-state">No status rows yet.</div>
            }
          </div>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <div class="ya-page-card dash-chart xl:col-span-2">
          <div class="dash-chart__head">
            <div>
              <h3 class="dash-chart__title">Booking status mix</h3>
              <p class="dash-chart__sub">Distribution across all booking statuses</p>
            </div>
          </div>
          @if (donut().series.length) {
            <apx-chart
              [series]="donut().series"
              [chart]="donut().chart"
              [labels]="donut().labels"
              [legend]="donut().legend"
              [plotOptions]="donut().plotOptions"
              [dataLabels]="donut().dataLabels"
              [colors]="donut().colors"
              [tooltip]="donut().tooltip"
            />
          } @else if (!loading()) {
            <div class="empty-state">No status data yet.</div>
          }
        </div>

        <div class="ya-page-card dash-chart">
          <div class="dash-chart__head">
            <div>
              <h3 class="dash-chart__title">Volume pulse</h3>
              <p class="dash-chart__sub">Today · pending · fleet · customers</p>
            </div>
          </div>
          @if (bar().series.length) {
            <apx-chart
              [series]="bar().series"
              [chart]="bar().chart"
              [xaxis]="bar().xaxis"
              [yaxis]="bar().yaxis"
              [dataLabels]="bar().dataLabels"
              [stroke]="bar().stroke"
              [fill]="bar().fill"
              [tooltip]="bar().tooltip"
              [colors]="bar().colors"
              [grid]="bar().grid"
              [plotOptions]="bar().plotOptions"
            />
          }
        </div>
      </div>
    </div>
  `,
})
export class ReportsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);

  readonly periods: Array<{ id: ReportPeriod; label: string }> = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ];

  readonly period = signal<ReportPeriod>('day');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly counts = signal<CountCard[]>([]);
  readonly statusRows = signal<Array<{ status: string; count: number }>>([]);
  readonly line = signal<LineChart>(this.emptyLine());
  readonly donut = signal<DonutOptions>({
    series: [],
    chart: {
      type: 'donut',
      height: 320,
      toolbar: { show: false },
      fontFamily: 'inherit',
      animations: { enabled: true, speed: 800 },
    },
    labels: [],
    legend: { position: 'bottom', fontSize: '12px', markers: { size: 6 } },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: { show: true, label: 'Trips', fontSize: '13px', fontWeight: 600 },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: 'light' },
    colors: ['#3B82F6', '#F59E0B', '#22C55E', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#64748B'],
  });
  readonly bar = signal<BarOptions>({
    series: [],
    chart: {
      type: 'bar',
      height: 320,
      toolbar: { show: false },
      fontFamily: 'inherit',
      animations: { enabled: true, speed: 750 },
    },
    xaxis: { categories: [], labels: { style: { colors: '#64748B', fontSize: '11px' } } },
    yaxis: { labels: { style: { colors: '#64748B', fontSize: '11px' } } },
    dataLabels: { enabled: false },
    stroke: { show: false },
    fill: { type: 'solid', opacity: 1 },
    tooltip: { theme: 'light' },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    colors: ['#6366F1'],
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '48%',
        distributed: true,
      },
    },
  });

  ngOnInit(): void {
    this.reload();
  }

  setPeriod(next: ReportPeriod): void {
    if (this.period() === next) return;
    this.period.set(next);
    this.reload();
  }

  periodTitle(): string {
    const map: Record<ReportPeriod, string> = {
      day: 'Daily',
      week: 'Weekly',
      month: 'Monthly',
    };
    return map[this.period()];
  }

  label(status: string): string {
    return statusLabel(status);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const period = this.period();
    forkJoin({
      reports: this.api.get(`/reports?period=${period}`),
      stats: this.api.dashboard(),
    }).subscribe({
      next: ({ reports, stats }) => {
        this.applyReports((reports.data ?? {}) as ReportsPayload, period);
        this.applyVolume(stats);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load reports';
        this.error.set(message);
        this.loading.set(false);
        this.snack.open(message, 'Close');
      },
    });
  }

  private applyVolume(stats: DashboardStats): void {
    this.bar.update((b) => ({
      ...b,
      series: [
        {
          name: 'Count',
          data: [
            stats.bookings_today,
            stats.pending_bookings,
            stats.active_drivers,
            stats.customers,
            stats.enquiries ?? 0,
          ],
        },
      ],
      xaxis: { categories: ['Today', 'Pending', 'Drivers', 'Customers', 'Enquiries'] },
      colors: ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899'],
    }));
  }

  private applyReports(data: ReportsPayload, period: ReportPeriod): void {
    const c = data.counts ?? {
      bookings: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
      revenue: 0,
    };
    const hint =
      period === 'week' ? 'Last 12 weeks' : period === 'month' ? 'Last 12 months' : 'Last 14 days';

    this.counts.set([
      {
        label: 'Total bookings',
        value: String(c.bookings ?? 0),
        hint,
        icon: 'local_taxi',
        theme: 'blue',
      },
      {
        label: 'Completed',
        value: String(c.completed ?? 0),
        hint,
        icon: 'check_circle',
        theme: 'green',
      },
      {
        label: 'Pending',
        value: String(c.pending ?? 0),
        hint,
        icon: 'schedule',
        theme: 'amber',
      },
      {
        label: 'Revenue',
        value: `₹${Math.round(Number(c.revenue ?? 0)).toLocaleString('en-IN')}`,
        hint: 'Completed trips',
        icon: 'payments',
        theme: 'violet',
      },
    ]);

    const seriesRows = Array.isArray(data.series) ? data.series : [];
    const labels = seriesRows.map((r) => r.label);
    const bookings = seriesRows.map((r) => Number(r.bookings ?? 0));
    const completed = seriesRows.map((r) => Number(r.completed ?? 0));

    this.line.set({
      series: [
        { name: 'Bookings', data: bookings },
        { name: 'Completed', data: completed },
      ],
      chart: {
        type: 'line',
        height: 360,
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: {
          enabled: true,
          speed: 900,
          animateGradually: { enabled: true, delay: 140 },
          dynamicAnimation: { enabled: true, speed: 450 },
        },
      },
      xaxis: {
        categories: labels,
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          rotate: period === 'week' ? -25 : 0,
          hideOverlappingLabels: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: (v) => String(Math.round(v)),
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: 3,
        lineCap: 'round',
      },
      fill: { type: 'solid', opacity: 1 },
      markers: {
        size: 4,
        strokeWidth: 2,
        strokeColors: '#fff',
        hover: { size: 6 },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (v) => `${Math.round(Number(v ?? 0))} trips` },
      },
      grid: {
        borderColor: 'rgba(148, 163, 184, 0.22)',
        strokeDashArray: 4,
        padding: { left: 8, right: 8 },
      },
      colors: ['#2563eb', '#16a34a'],
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        markers: { size: 8 },
      },
    });

    const status = Array.isArray(data.bookings_by_status) ? data.bookings_by_status : [];
    this.statusRows.set(
      status.map((r) => ({
        status: String(r.status ?? 'unknown'),
        count: Number(r.count ?? 0),
      })),
    );
    this.donut.update((d) => ({
      ...d,
      series: status.map((r) => Number(r.count ?? 0)),
      labels: status.map((r) => statusLabel(String(r.status ?? 'unknown'))),
    }));
  }

  private emptyLine(): LineChart {
    return {
      series: [],
      chart: { type: 'line', height: 360, toolbar: { show: false } },
      xaxis: { categories: [] },
      yaxis: {},
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: 'solid' },
      tooltip: {},
      grid: {},
      colors: ['#2563eb', '#16a34a'],
      legend: { show: true },
      markers: { size: 4 },
    };
  }
}
