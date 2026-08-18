import { AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { AdminStaffUser, ApiError } from '../../core/api/api.types';
import { AuthService } from '../../core/auth/auth.service';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    YaModalPortalDirective,
  ],
  template: `
    <div class="page-wrap space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="page-title">Users</h2>
          <p class="page-subtitle">Create staff accounts and assign roles such as Booking Manager or Super Admin.</p>
        </div>
        <a mat-flat-button class="ya-btn-primary" routerLink="/admin-users/new">Create user</a>
      </div>

      <div class="table-card overflow-hidden">
        <div class="ya-datatable-toolbar">
          <div class="ya-datatable-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              class="ya-input"
              placeholder="Search name, email, phone…"
              [value]="search()"
              (input)="onSearch($event)"
              aria-label="Search users"
            />
          </div>
          <p class="ya-datatable-meta">
            {{ filteredCount() }} user{{ filteredCount() === 1 ? '' : 's' }}
          </p>
        </div>

        <div class="overflow-x-auto">
          <table mat-table [dataSource]="dataSource" matSort class="w-full min-w-[860px] ya-datatable">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="ya-cell-left">Name</th>
              <td mat-cell *matCellDef="let u" class="ya-cell-left">
                <p class="bk-table__strong">{{ u.name }}</p>
                <p class="bk-table__sub">{{ u.email }}</p>
              </td>
            </ng-container>

            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Phone</th>
              <td mat-cell *matCellDef="let u">{{ u.phone || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="role_name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
              <td mat-cell *matCellDef="let u">{{ u.role_name || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="is_active">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let u">
                <span class="chip" [class]="u.is_active ? 'tone-success' : 'tone-muted'">
                  {{ u.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="last_login_at">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Last login</th>
              <td mat-cell *matCellDef="let u">{{ formatWhen(u.last_login_at) }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="ya-col-actions">Actions</th>
              <td mat-cell *matCellDef="let u" class="ya-col-actions">
                <div class="ya-row-actions">
                  <a mat-stroked-button class="ya-action-btn ya-action-btn--edit" [routerLink]="['/admin-users', u.id, 'edit']">
                    Edit
                  </a>
                  @if (u.is_active) {
                    <button
                      mat-stroked-button
                      class="ya-action-btn ya-action-btn--delete"
                      type="button"
                      [disabled]="busyId() === u.id || u.id === currentUserId()"
                      (click)="askDeactivate(u)"
                    >
                      Deactivate
                    </button>
                  } @else {
                    <button
                      mat-stroked-button
                      class="ya-action-btn ya-action-btn--edit"
                      type="button"
                      [disabled]="busyId() === u.id"
                      (click)="activate(u)"
                    >
                      Activate
                    </button>
                  }
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>

        @if (dataSource.data.length === 0) {
          <p class="px-5 py-8 text-sm text-slate-500">{{ emptyMessage() }}</p>
        }

        <mat-paginator [pageSizeOptions]="pageSizeOptions" showFirstLastButtons />
      </div>
    </div>

    @if (pending(); as target) {
      <div class="ya-modal-overlay" yaModalPortal (click)="pending.set(null)" role="presentation">
        <div class="ya-confirm" (click)="$event.stopPropagation()" role="alertdialog" aria-modal="true">
          <div class="ya-confirm__icon ya-confirm__icon--warn" aria-hidden="true">
            <mat-icon>person_off</mat-icon>
          </div>
          <h3 class="ya-confirm__title">Deactivate {{ target.name }}?</h3>
          <p class="ya-confirm__text">They will not be able to sign in until you activate the account again.</p>
          <div class="ya-confirm__footer">
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="pending.set(null)">Cancel</button>
            <button
              mat-flat-button
              class="ya-action-btn ya-action-btn--delete ya-confirm__danger"
              type="button"
              (click)="confirmDeactivate()"
            >
              Deactivate
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminUsersPage implements OnInit, AfterViewInit {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly columns = ['name', 'phone', 'role_name', 'is_active', 'last_login_at', 'actions'];
  readonly pageSizeOptions = [10, 25, 50];
  readonly dataSource = new MatTableDataSource<AdminStaffUser>([]);
  readonly search = signal('');
  readonly filteredCount = signal(0);
  readonly busyId = signal<string | null>(null);
  readonly pending = signal<AdminStaffUser | null>(null);
  readonly emptyMessage = signal('Loading users…');

  currentUserId(): string {
    return this.auth.user()?.id ?? '';
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (row, filter) => {
      const hay = [row.name, row.email, row.phone, row.role_name].join(' ').toLowerCase();
      return hay.includes(filter);
    };
    this.reload();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort ?? null;
    this.dataSource.paginator = this.paginator ?? null;
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.dataSource.filter = value.trim().toLowerCase();
    this.filteredCount.set(this.dataSource.filteredData.length);
  }

  formatWhen(raw: string | null): string {
    if (!raw) return '—';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    return dt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private permissionMessage(err: unknown): string {
    if (err instanceof ApiError && err.status === 403) {
      return 'Only Super Admin can manage users.';
    }
    return err instanceof Error ? err.message : 'Request failed.';
  }

  reload(): void {
    this.api.listAdminUsers({ per_page: 200 }).subscribe({
      next: (res) => {
        this.dataSource.data = res.data ?? [];
        this.dataSource.filter = this.search().trim().toLowerCase();
        this.filteredCount.set(this.dataSource.filteredData.length);
        this.emptyMessage.set('No staff users yet.');
        queueMicrotask(() => {
          this.dataSource.sort = this.sort ?? null;
          this.dataSource.paginator = this.paginator ?? null;
        });
      },
      error: (err: unknown) => {
        this.dataSource.data = [];
        this.filteredCount.set(0);
        this.emptyMessage.set(this.permissionMessage(err));
        this.snack.open(this.permissionMessage(err), 'OK', { duration: 3200 });
      },
    });
  }

  askDeactivate(user: AdminStaffUser): void {
    this.pending.set(user);
  }

  confirmDeactivate(): void {
    const user = this.pending();
    this.pending.set(null);
    if (!user) return;
    this.busyId.set(user.id);
    this.api.deactivateAdminUser(user.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.snack.open(`${user.name} deactivated`, 'OK', { duration: 2200 });
        this.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.snack.open(this.permissionMessage(err), 'OK', { duration: 3200 });
      },
    });
  }

  activate(user: AdminStaffUser): void {
    this.busyId.set(user.id);
    this.api.activateAdminUser(user.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.snack.open(`${user.name} activated`, 'OK', { duration: 2200 });
        this.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.snack.open(this.permissionMessage(err), 'OK', { duration: 3200 });
      },
    });
  }
}
