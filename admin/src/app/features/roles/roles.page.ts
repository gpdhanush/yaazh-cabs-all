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
import { AdminRole, ApiError } from '../../core/api/api.types';
import { AuthService } from '../../core/auth/auth.service';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';

@Component({
  selector: 'app-roles-page',
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
          <h2 class="page-title">Roles & access</h2>
          <p class="page-subtitle">
            Create roles, then tick the menus and actions that role can use. Assign the role when you create a staff user.
          </p>
        </div>
        @if (canManage()) {
          <a mat-flat-button class="ya-btn-primary" routerLink="/roles/new">Create role</a>
        }
      </div>

      <div class="table-card overflow-hidden">
        <div class="ya-datatable-toolbar">
          <div class="ya-datatable-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              class="ya-input"
              placeholder="Search role name…"
              [value]="search()"
              (input)="onSearch($event)"
              aria-label="Search roles"
            />
          </div>
          <p class="ya-datatable-meta">
            {{ filteredCount() }} role{{ filteredCount() === 1 ? '' : 's' }}
          </p>
        </div>

        <div class="overflow-x-auto">
          <table mat-table [dataSource]="dataSource" matSort class="w-full min-w-[760px] ya-datatable">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="ya-cell-left">Role</th>
              <td mat-cell *matCellDef="let r" class="ya-cell-left">
                <p class="bk-table__strong">{{ r.name }}</p>
                <p class="bk-table__sub">{{ r.description || 'No description' }}</p>
              </td>
            </ng-container>

            <ng-container matColumnDef="permission_count">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Access</th>
              <td mat-cell *matCellDef="let r">{{ r.permission_count ?? 0 }} permission{{ r.permission_count === 1 ? '' : 's' }}</td>
            </ng-container>

            <ng-container matColumnDef="user_count">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Staff</th>
              <td mat-cell *matCellDef="let r">{{ r.user_count ?? 0 }}</td>
            </ng-container>

            <ng-container matColumnDef="is_active">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let r">
                <span class="chip" [class]="r.is_active ? 'tone-success' : 'tone-muted'">
                  {{ r.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="ya-col-actions">Actions</th>
              <td mat-cell *matCellDef="let r" class="ya-col-actions">
                @if (canManage()) {
                  <div class="ya-row-actions">
                    <a mat-stroked-button class="ya-action-btn ya-action-btn--edit" [routerLink]="['/roles', r.id, 'edit']">
                      {{ r.is_system ? 'View access' : 'Set access' }}
                    </a>
                    @if (!r.is_system) {
                      @if (r.is_active) {
                        <button
                          mat-stroked-button
                          class="ya-action-btn ya-action-btn--delete"
                          type="button"
                          [disabled]="busyId() === r.id"
                          (click)="askDeactivate(r)"
                        >
                          Deactivate
                        </button>
                      } @else {
                        <button
                          mat-stroked-button
                          class="ya-action-btn ya-action-btn--edit"
                          type="button"
                          [disabled]="busyId() === r.id"
                          (click)="activate(r)"
                        >
                          Activate
                        </button>
                      }
                    }
                  </div>
                } @else {
                  <span class="text-sm text-slate-500">View only</span>
                }
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
            <mat-icon>lock</mat-icon>
          </div>
          <h3 class="ya-confirm__title">Deactivate {{ target.name }}?</h3>
          <p class="ya-confirm__text">
            Staff can no longer be assigned this role. Move any active staff off it first.
          </p>
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
export class RolesPage implements OnInit, AfterViewInit {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly columns = ['name', 'permission_count', 'user_count', 'is_active', 'actions'];
  readonly pageSizeOptions = [10, 25, 50];
  readonly dataSource = new MatTableDataSource<AdminRole>([]);
  readonly search = signal('');
  readonly filteredCount = signal(0);
  readonly busyId = signal<string | null>(null);
  readonly pending = signal<AdminRole | null>(null);
  readonly emptyMessage = signal('Loading roles…');

  canManage(): boolean {
    return this.auth.hasPermission('admin_users.manage');
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (row, filter) => {
      const hay = [row.name, row.description].join(' ').toLowerCase();
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

  private failMessage(err: unknown): string {
    if (err instanceof ApiError && err.status === 403) {
      return err.message || 'Only Super Admin can manage roles.';
    }
    return err instanceof Error ? err.message : 'Request failed.';
  }

  reload(): void {
    this.api.listAdminRoles({ all: '1' }).subscribe({
      next: (roles) => {
        this.dataSource.data = roles;
        this.dataSource.filter = this.search().trim().toLowerCase();
        this.filteredCount.set(this.dataSource.filteredData.length);
        this.emptyMessage.set('No roles yet. Create one to assign access.');
        queueMicrotask(() => {
          this.dataSource.sort = this.sort ?? null;
          this.dataSource.paginator = this.paginator ?? null;
        });
      },
      error: (err: unknown) => {
        this.dataSource.data = [];
        this.filteredCount.set(0);
        this.emptyMessage.set(this.failMessage(err));
        this.snack.open(this.failMessage(err), 'OK', { duration: 3200 });
      },
    });
  }

  askDeactivate(role: AdminRole): void {
    this.pending.set(role);
  }

  confirmDeactivate(): void {
    const role = this.pending();
    this.pending.set(null);
    if (!role) return;
    this.busyId.set(role.id);
    this.api.deactivateAdminRole(role.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.snack.open(`${role.name} deactivated`, 'OK', { duration: 2200 });
        this.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.snack.open(this.failMessage(err), 'OK', { duration: 3200 });
      },
    });
  }

  activate(role: AdminRole): void {
    this.busyId.set(role.id);
    this.api.activateAdminRole(role.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.snack.open(`${role.name} activated`, 'OK', { duration: 2200 });
        this.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.snack.open(this.failMessage(err), 'OK', { duration: 3200 });
      },
    });
  }
}
