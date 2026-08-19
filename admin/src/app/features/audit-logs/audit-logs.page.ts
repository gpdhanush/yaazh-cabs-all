import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { AuditLog } from '../../core/api/api.types';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';

@Component({
  selector: 'app-audit-logs-page',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    YaModalPortalDirective,
  ],
  template: `
    <div class="page-wrap space-y-4">
      <div>
        <h2 class="page-title">Audit logs</h2>
        <p class="page-subtitle">
          Read-only history of admin actions — bookings, drivers, settings, and other sensitive changes.
        </p>
      </div>

      <div class="table-card overflow-hidden">
        <div class="ya-datatable-toolbar">
          <div class="ya-datatable-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              class="ya-input"
              placeholder="Search action, entity, ID…"
              [ngModel]="search()"
              (ngModelChange)="onSearch($event)"
              aria-label="Search audit logs"
            />
          </div>
          <p class="ya-datatable-meta">{{ total() }} record{{ total() === 1 ? '' : 's' }}</p>
        </div>

        <div class="overflow-x-auto">
          <table mat-table [dataSource]="rows()" class="w-full min-w-[760px] ya-datatable">
            <ng-container matColumnDef="when">
              <th mat-header-cell *matHeaderCellDef>When</th>
              <td mat-cell *matCellDef="let row">{{ formatWhen(row.created_at) }}</td>
            </ng-container>

            <ng-container matColumnDef="admin">
              <th mat-header-cell *matHeaderCellDef class="ya-cell-left">Admin</th>
              <td mat-cell *matCellDef="let row" class="ya-cell-left">
                <p class="bk-table__strong">{{ row.admin_name || 'System' }}</p>
                @if (row.admin_email) {
                  <p class="bk-table__sub">{{ row.admin_email }}</p>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef class="ya-cell-left">Action</th>
              <td mat-cell *matCellDef="let row" class="ya-cell-left">
                <span class="chip tone-muted">{{ formatAction(row.action) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="entity">
              <th mat-header-cell *matHeaderCellDef class="ya-cell-left">Entity</th>
              <td mat-cell *matCellDef="let row" class="ya-cell-left">
                {{ formatEntity(row.entity_type) }}
                @if (row.entity_id) {
                  <span class="bk-table__sub"> · #{{ row.entity_id }}</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="ip">
              <th mat-header-cell *matHeaderCellDef>IP</th>
              <td mat-cell *matCellDef="let row">{{ row.ip_address || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="ya-col-actions">Actions</th>
              <td mat-cell *matCellDef="let row" class="ya-col-actions">
                <button
                  mat-flat-button
                  class="ya-action-btn ya-action-btn--open"
                  type="button"
                  (click)="openDetail(row)"
                >
                  View
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          @if (!loading() && rows().length === 0) {
            <div class="ya-datatable-empty">No audit logs match your search.</div>
          }
          @if (loading()) {
            <div class="ya-datatable-empty">Loading audit logs…</div>
          }
        </div>

        <mat-paginator
          [length]="total()"
          [pageIndex]="pageIndex()"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [showFirstLastButtons]="true"
          (page)="onPage($event)"
          aria-label="Audit log pages"
        />
      </div>

      @if (detail(); as item) {
        <div class="ya-modal-overlay" yaModalPortal (click)="closeDetail()" role="presentation">
          <div
            class="ya-modal ya-modal--wide"
            (click)="$event.stopPropagation()"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
          >
            <div class="ya-modal__header">
              <div>
                <h3 id="audit-detail-title" class="ya-modal__title">{{ formatAction(item.action) }}</h3>
                <p class="ya-modal__subtitle">
                  {{ formatWhen(item.created_at) }}
                  @if (item.admin_name) {
                    · {{ item.admin_name }}
                  }
                </p>
              </div>
              <button type="button" class="ya-modal__close" (click)="closeDetail()" aria-label="Close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="ya-modal__body space-y-4">
              <div class="ya-kv-grid">
                <div>
                  <p class="ya-kv-label">Entity</p>
                  <p class="ya-kv-value">
                    {{ formatEntity(item.entity_type) }}
                    @if (item.entity_id) {
                      <span class="bk-table__sub"> #{{ item.entity_id }}</span>
                    }
                  </p>
                </div>
                <div>
                  <p class="ya-kv-label">IP address</p>
                  <p class="ya-kv-value">{{ item.ip_address || '—' }}</p>
                </div>
              </div>

              @if (item.user_agent) {
                <div>
                  <p class="ya-kv-label">User agent</p>
                  <p class="ya-kv-value text-sm break-all">{{ item.user_agent }}</p>
                </div>
              }

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <p class="ya-kv-label">Before</p>
                  <pre class="audit-json">{{ formatJson(item.old_values) }}</pre>
                </div>
                <div>
                  <p class="ya-kv-label">After</p>
                  <pre class="audit-json">{{ formatJson(item.new_values) }}</pre>
                </div>
              </div>
            </div>

            <div class="ya-modal__footer">
              <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="closeDetail()">Close</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .ya-modal--wide {
      width: min(920px, 100%);
    }
    .audit-json {
      margin: 0;
      padding: 12px;
      border-radius: 5px;
      border: 1px solid var(--ya-border);
      background: var(--ya-surface-muted, #f8fafc);
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 280px;
      overflow: auto;
    }
    .ya-kv-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .ya-kv-label {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ya-text-muted, #64748b);
    }
    .ya-kv-value {
      margin: 0;
      font-size: 14px;
    }
  `,
})
export class AuditLogsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly displayedColumns = ['when', 'admin', 'action', 'entity', 'ip', 'actions'];
  readonly pageSizeOptions = [25, 50, 100];
  readonly rows = signal<AuditLog[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly search = signal('');
  readonly detail = signal<AuditLog | null>(null);
  readonly pageIndex = signal(0);

  pageSize = 25;
  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.reload();
  }

  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.pageIndex.set(0);
      if (this.paginator) this.paginator.firstPage();
      this.reload();
    }, 300);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize = event.pageSize;
    this.reload(event.pageIndex + 1, event.pageSize);
  }

  reload(page = this.pageIndex() + 1, perPage = this.pageSize): void {
    this.loading.set(true);
    const q = this.search().trim();
    this.api
      .listAuditLogs({
        page,
        per_page: perPage,
        ...(q ? { q } : {}),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.rows.set(res.data ?? []);
          this.total.set(res.meta?.total ?? 0);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.rows.set([]);
          this.total.set(0);
          this.snack.open(err instanceof Error ? err.message : 'Could not load audit logs', 'Close', {
            duration: 4000,
          });
        },
      });
  }

  openDetail(row: AuditLog): void {
    this.api.getAuditLog(row.id).subscribe({
      next: (item) => {
        this.detail.set(item);
        document.body.style.overflow = 'hidden';
      },
      error: (err: unknown) =>
        this.snack.open(err instanceof Error ? err.message : 'Could not load details', 'Close'),
    });
  }

  closeDetail(): void {
    this.detail.set(null);
    document.body.style.overflow = '';
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

  formatAction(action: string): string {
    return action.replace(/\./g, ' · ').replace(/_/g, ' ');
  }

  formatEntity(entityType: string | null): string {
    if (!entityType) return '—';
    return entityType.replace(/_/g, ' ');
  }

  formatJson(value: unknown): string {
    if (value == null) return '—';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
