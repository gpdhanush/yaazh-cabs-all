import { DatePipe, TitleCasePipe } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { Booking } from '../../core/api/api.types';
import { canAssignDriver, statusLabel, statusTone } from '../../shared/status-chip';

@Component({
  selector: 'app-bookings-page',
  standalone: true,
  imports: [
    DatePipe,
    TitleCasePipe,
    FormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-wrap space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="page-title">Bookings</h2>
          <p class="page-subtitle">Confirm trips, assign drivers, and track status through completion.</p>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <div class="ya-field bk-status-filter">
            <label for="booking-status">Status</label>
            <div class="bk-select-wrap">
              <select
                id="booking-status"
                class="ya-field__control bk-select"
                [(ngModel)]="status"
                (ngModelChange)="onStatusChange()"
              >
                <option value="">All statuses</option>
                @for (s of statuses; track s) {
                  <option [value]="s">{{ label(s) }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="table-card overflow-hidden">
        <div class="ya-datatable-toolbar">
          <div class="ya-datatable-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              class="ya-input"
              placeholder="Search reference, customer, route, driver…"
              [value]="search()"
              (input)="onSearch($event)"
              aria-label="Search bookings"
            />
          </div>
          <p class="ya-datatable-meta">
            {{ filteredCount() }} booking{{ filteredCount() === 1 ? '' : 's' }}
            @if (search()) {
              <span>matching “{{ search() }}”</span>
            }
          </p>
        </div>

        <div class="overflow-x-auto">
          <table mat-table [dataSource]="dataSource" matSort class="w-full min-w-[980px] ya-datatable bk-table">
            <ng-container matColumnDef="booking_reference">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="ya-cell-left">Reference</th>
              <td mat-cell *matCellDef="let b" class="ya-cell-left">
                <a class="bk-table__ref" [routerLink]="['/bookings', b.id]">{{ b.booking_reference }}</a>
                <p class="bk-table__sub">{{ b.trip_type | titlecase }} · {{ b.pickup_at | date: 'MMM d, h:mm a' }}</p>
              </td>
            </ng-container>

            <ng-container matColumnDef="customer_name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="ya-cell-left">Customer</th>
              <td mat-cell *matCellDef="let b" class="ya-cell-left">
                <p class="bk-table__strong">{{ b.customer_name }}</p>
                <p class="bk-table__sub">{{ b.customer_phone }}</p>
              </td>
            </ng-container>

            <ng-container matColumnDef="pickup_location">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="ya-cell-left">Route</th>
              <td mat-cell *matCellDef="let b" class="ya-cell-left">
                <div class="bk-route-cell">
                  <p class="bk-route-cell__from">{{ b.pickup_location }}</p>
                  <p class="bk-route-cell__to">→ {{ b.drop_location }}</p>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="driver_name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Driver</th>
              <td mat-cell *matCellDef="let b">
                @if (b.driver; as d) {
                  <p class="bk-table__strong">{{ d.name }}</p>
                  <p class="bk-table__sub">{{ d.phone }}</p>
                } @else {
                  <span class="bk-table__muted">Unassigned</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let b">
                <span class="chip" [class]="tone(b.status)">{{ label(b.status) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="estimated_total">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Fare / km</th>
              <td mat-cell *matCellDef="let b">
                <p class="bk-table__fare">₹{{ b.estimated_total }}</p>
                <p class="bk-table__sub">
                  @if (b.odometer_difference_km != null || b.actual_distance_km != null) {
                    Trip {{ b.odometer_difference_km ?? b.actual_distance_km }} km
                  } @else if (b.start_odometer_km != null) {
                    Start {{ b.start_odometer_km }} km
                  } @else {
                    Est. {{ b.estimated_distance_km != null ? b.estimated_distance_km + ' km' : '—' }}
                  }
                </p>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="ya-col-actions">Actions</th>
              <td mat-cell *matCellDef="let b" class="ya-col-actions whitespace-nowrap">
                <div class="ya-row-actions">
                  @if (b.status === 'pending') {
                    <button mat-flat-button class="ya-action-btn ya-action-btn--edit" type="button" (click)="confirm(b)">
                      Confirm
                    </button>
                    <button mat-flat-button class="ya-action-btn ya-action-btn--delete" type="button" (click)="cancel(b)">
                      Cancel
                    </button>
                  }
                  <a mat-flat-button class="ya-action-btn ya-action-btn--open" [routerLink]="['/bookings', b.id]">
                    {{ canAssign(b.status) ? 'Assign' : 'Open' }}
                  </a>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
          @if (filteredCount() === 0) {
            <div class="ya-datatable-empty">
              {{ search() || status ? 'No matching bookings.' : 'No bookings yet.' }}
            </div>
          }
        </div>

        <mat-paginator
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [showFirstLastButtons]="true"
          aria-label="Select page"
        />
      </div>
    </div>
  `,
})
export class BookingsPage implements OnInit, AfterViewInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly columns = [
    'booking_reference',
    'customer_name',
    'pickup_location',
    'driver_name',
    'status',
    'estimated_total',
    'actions',
  ];
  readonly statuses = [
    'pending',
    'confirmed',
    'driver_assigned',
    'on_the_way',
    'arrived',
    'trip_started',
    'completed',
    'cancelled',
  ];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly dataSource = new MatTableDataSource<Booking>([]);
  readonly search = signal('');
  readonly filteredCount = signal(0);

  pageSize = 10;
  status = '';
  tone = statusTone;
  label = statusLabel;
  canAssign = canAssignDriver;

  ngOnInit(): void {
    this.status = this.route.snapshot.queryParamMap.get('status') || '';
    this.dataSource.filterPredicate = (row, filter) => this.rowMatches(row, filter);
    this.dataSource.sortingDataAccessor = (row, key) => this.sortValue(row, key);
    this.reload();
  }

  ngAfterViewInit(): void {
    this.bindTableControls();
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.dataSource.filter = value.trim().toLowerCase();
    this.filteredCount.set(this.dataSource.filteredData.length);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onStatusChange(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: this.status || null },
      queryParamsHandling: 'merge',
    });
    this.reload();
  }

  reload(): void {
    this.api
      .listBookings({
        page: 1,
        per_page: 500,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data;
          this.dataSource.filter = this.search().trim().toLowerCase();
          this.filteredCount.set(this.dataSource.filteredData.length);
          this.bindTableControls();
          if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
        },
        error: (err: unknown) =>
          this.snack.open(err instanceof Error ? err.message : 'Failed to load bookings', 'Close', {
            duration: 4000,
          }),
      });
  }

  confirm(b: Booking): void {
    this.api.confirmBooking(b.id).subscribe({
      next: () => {
        this.snack.open(`Confirmed ${b.booking_reference}`, 'OK', { duration: 2500 });
        this.reload();
      },
      error: (err: unknown) => this.snack.open(err instanceof Error ? err.message : 'Confirm failed', 'Close'),
    });
  }

  cancel(b: Booking): void {
    const reason = window.prompt('Cancellation reason?', 'Cancelled by admin') || undefined;
    this.api.cancelBooking(b.id, reason).subscribe({
      next: () => {
        this.snack.open(`Cancelled ${b.booking_reference}`, 'OK', { duration: 2500 });
        this.reload();
      },
      error: (err: unknown) => this.snack.open(err instanceof Error ? err.message : 'Cancel failed', 'Close'),
    });
  }

  private bindTableControls(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  private rowMatches(row: Booking, filter: string): boolean {
    if (!filter) return true;
    const haystack = [
      row.booking_reference,
      row.customer_name,
      row.customer_phone,
      row.pickup_location,
      row.drop_location,
      row.status,
      row.trip_type,
      row.driver?.name,
      row.driver?.phone,
      row.estimated_total,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(filter);
  }

  private sortValue(row: Booking, key: string): string | number {
    switch (key) {
      case 'booking_reference':
        return row.booking_reference || '';
      case 'customer_name':
        return row.customer_name || '';
      case 'pickup_location':
        return `${row.pickup_location || ''} ${row.drop_location || ''}`;
      case 'driver_name':
        return row.driver?.name || '';
      case 'status':
        return row.status || '';
      case 'estimated_total':
        return Number(row.estimated_total) || 0;
      default:
        return String((row as unknown as Record<string, unknown>)[key] ?? '');
    }
  }
}
