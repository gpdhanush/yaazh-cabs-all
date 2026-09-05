import { AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { availabilityLabel, onlineLabel } from '../../shared/status-chip';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';
import { ResourceConfig, ResourceField } from './resource-types';

type Col = ResourceConfig['columns'][number];

@Component({
  selector: 'app-resource-list-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
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
          <h2 class="page-title">{{ config().title }}</h2>
          <p class="page-subtitle">{{ config().description || 'Manage records via admin API.' }}</p>
        </div>
        <div class="flex gap-2">
          @if (config().createRoute) {
            <a mat-flat-button class="ya-btn-primary" [routerLink]="config().createRoute">Create</a>
          } @else if (config().createFields?.length) {
            <button mat-flat-button class="ya-btn-primary" type="button" (click)="openCreate()">Create</button>
          }
        </div>
      </div>

      <div class="table-card overflow-hidden">
        <div class="ya-datatable-toolbar">
          <div class="ya-datatable-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              class="ya-input"
              placeholder="Search…"
              [value]="search()"
              (input)="onSearch($event)"
              aria-label="Search table"
            />
          </div>
          <p class="ya-datatable-meta">
            {{ filteredCount() }} record{{ filteredCount() === 1 ? '' : 's' }}
            @if (search()) {
              <span>matching “{{ search() }}”</span>
            }
          </p>
        </div>

        <div class="overflow-x-auto">
          <table mat-table [dataSource]="dataSource" matSort class="w-full min-w-[720px] ya-datatable">
            @for (col of config().columns; track col.key) {
              <ng-container [matColumnDef]="col.key">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  mat-sort-header
                  [disabled]="col.type === 'serial' || col.key === '#'"
                  [class.ya-cell-left]="
                    col.key === 'title' ||
                    col.key === 'corridor' ||
                    col.key === 'name' ||
                    col.key === 'subject' ||
                    col.key === 'email' ||
                    col.key === 'phone' ||
                    col.key === 'driver_name' ||
                    col.key === 'driver_phone' ||
                    col.key === 'customer_name' ||
                    col.key === 'question' ||
                    col.key === 'review_snippet' ||
                    col.key === 'vehicle_name' ||
                    col.key === 'category_name' ||
                    col.key === 'route_label' ||
                    col.key === 'trip_type_label' ||
                    col.key === 'registration_no'
                  "
                >
                  {{ col.label }}
                </th>
                <td
                  mat-cell
                  *matCellDef="let row; let i = index"
                  [class.ya-cell-left]="
                    col.key === 'title' ||
                    col.key === 'corridor' ||
                    col.key === 'name' ||
                    col.key === 'subject' ||
                    col.key === 'email' ||
                    col.key === 'phone' ||
                    col.key === 'driver_name' ||
                    col.key === 'driver_phone' ||
                    col.key === 'customer_name' ||
                    col.key === 'question' ||
                    col.key === 'review_snippet' ||
                    col.key === 'vehicle_name' ||
                    col.key === 'category_name' ||
                    col.key === 'route_label' ||
                    col.key === 'trip_type_label' ||
                    col.key === 'registration_no'
                  "
                >
                  {{ display(row, col, i) }}
                </td>
              </ng-container>
            }
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="ya-col-actions">Actions</th>
              <td mat-cell *matCellDef="let row" class="ya-col-actions whitespace-nowrap">
                <div class="ya-row-actions">
                  @if (config().detailPath) {
                    <a mat-flat-button class="ya-action-btn ya-action-btn--open" [routerLink]="[config().detailPath, row['id']]">
                      Open
                    </a>
                  }
                  @if (config().editRouteTemplate) {
                    <a mat-flat-button class="ya-action-btn ya-action-btn--edit" [routerLink]="editLink(row)">
                      Edit
                    </a>
                  } @else if (config().editFields?.length) {
                    <button mat-flat-button class="ya-action-btn ya-action-btn--edit" type="button" (click)="openEdit(row)">
                      Edit
                    </button>
                  }
                  @for (action of config().rowActions || []; track action.label) {
                    @if (!action.visibleWhen || row[action.visibleWhen.key] === action.visibleWhen.equals) {
                      <button
                        mat-flat-button
                        class="ya-action-btn"
                        [class.ya-action-btn--warn]="action.color === 'warn'"
                        [class.ya-action-btn--edit]="action.color === 'primary' || !action.color"
                        type="button"
                        (click)="runAction(row, action)"
                      >
                        {{ action.label }}
                      </button>
                    }
                  }
                  @if (config().canDelete) {
                    <button mat-flat-button class="ya-action-btn ya-action-btn--delete" type="button" (click)="askDelete(row)">
                      Delete
                    </button>
                  }
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns()"></tr>
          </table>
          @if (filteredCount() === 0) {
            <div class="ya-datatable-empty">
              {{ search() ? 'No matching records.' : 'No records yet for ' + config().title + '.' }}
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

      @if (showForm()) {
        <div class="ya-modal-overlay" yaModalPortal (click)="closeForm()">
          <div class="ya-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
            <div class="ya-modal__header">
              <div>
                <h3 class="ya-modal__title">
                  {{ formMode() === 'create' ? 'Create' : 'Edit' }} {{ config().title }}
                </h3>
                <p class="ya-modal__subtitle">Fill in the fields below and save.</p>
              </div>
              <button type="button" class="ya-modal__close" (click)="closeForm()" aria-label="Close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form class="ya-modal__form" [formGroup]="form" (ngSubmit)="submitForm()">
              <div class="ya-modal__body ya-field-grid cols-2">
                @for (field of activeFields(); track field.key) {
                  <div
                    class="ya-field ya-field--stacked"
                    [class.ya-field--full]="field.type === 'textarea' || field.type === 'password'"
                  >
                    <label class="ya-label" [attr.for]="'f-' + field.key">{{ field.label }}</label>
                    @if (field.type === 'select') {
                      <select class="ya-input" [id]="'f-' + field.key" [formControlName]="field.key">
                        @for (opt of field.options || []; track opt.value) {
                          <option [ngValue]="opt.value">{{ opt.label }}</option>
                        }
                      </select>
                    } @else if (field.type === 'textarea') {
                      <textarea
                        class="ya-input ya-input--area"
                        rows="4"
                        [id]="'f-' + field.key"
                        [formControlName]="field.key"
                        [placeholder]="'Enter ' + field.label.toLowerCase()"
                      ></textarea>
                    } @else {
                      <input
                        class="ya-input"
                        [id]="'f-' + field.key"
                        [type]="field.type || 'text'"
                        [formControlName]="field.key"
                        [placeholder]="'Enter ' + field.label.toLowerCase()"
                      />
                    }
                  </div>
                }
              </div>

              <div class="ya-modal__footer">
                <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="closeForm()">Cancel</button>
                <button mat-flat-button class="ya-btn-primary" type="submit">
                  {{ formMode() === 'create' ? 'Create' : 'Save changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (deleteRow()) {
        <div class="ya-modal-overlay" yaModalPortal (click)="cancelDelete()" role="presentation">
          <div
            class="ya-confirm"
            (click)="$event.stopPropagation()"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ya-delete-title"
            aria-describedby="ya-delete-desc"
          >
            <div class="ya-confirm__icon" aria-hidden="true">
              <mat-icon>delete_forever</mat-icon>
            </div>
            <h3 id="ya-delete-title" class="ya-confirm__title">{{ deleteTitle() }}</h3>
            <p id="ya-delete-desc" class="ya-confirm__text">
              {{ config().deleteConfirm || 'This record will be permanently removed. This cannot be undone.' }}
            </p>
            <div class="ya-confirm__footer">
              <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="cancelDelete()" [disabled]="deleting()">
                Cancel
              </button>
              <button
                mat-flat-button
                class="ya-action-btn ya-action-btn--delete ya-confirm__danger"
                type="button"
                (click)="confirmDelete()"
                [disabled]="deleting()"
              >
                {{ deleting() ? 'Deleting…' : 'Delete permanently' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (actionConfirm(); as ac) {
        <div class="ya-modal-overlay" yaModalPortal (click)="cancelAction()" role="presentation">
          <div
            class="ya-confirm"
            (click)="$event.stopPropagation()"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ya-action-title"
            aria-describedby="ya-action-desc"
          >
            <div
              class="ya-confirm__icon"
              [class.ya-confirm__icon--warn]="ac.action.color === 'warn'"
              [class.ya-confirm__icon--primary]="ac.action.color !== 'warn'"
              aria-hidden="true"
            >
              <mat-icon>{{ ac.action.confirmIcon || (ac.action.color === 'warn' ? 'warning' : 'help') }}</mat-icon>
            </div>
            <h3 id="ya-action-title" class="ya-confirm__title">
              {{ ac.action.confirmTitle || ac.action.label + '?' }}
            </h3>
            <p id="ya-action-desc" class="ya-confirm__text">{{ ac.action.confirm }}</p>
            <div class="ya-confirm__footer">
              <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="cancelAction()" [disabled]="actionBusy()">
                Cancel
              </button>
              <button
                mat-flat-button
                type="button"
                class="ya-action-btn"
                [class.ya-action-btn--warn]="ac.action.color === 'warn'"
                [class.ya-action-btn--edit]="ac.action.color !== 'warn'"
                [class.ya-confirm__danger]="ac.action.color === 'warn'"
                (click)="confirmAction()"
                [disabled]="actionBusy()"
              >
                {{ actionBusy() ? 'Working…' : ac.action.confirmButton || ac.action.label }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ResourceListPage implements OnInit, AfterViewInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly config = signal<ResourceConfig>({ title: '', path: '', columns: [] });
  readonly search = signal('');
  readonly filteredCount = signal(0);
  readonly showForm = signal(false);
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<string | null>(null);
  readonly deleteRow = signal<Record<string, unknown> | null>(null);
  readonly deleting = signal(false);
  readonly actionConfirm = signal<{
    row: Record<string, unknown>;
    action: NonNullable<ResourceConfig['rowActions']>[number];
  } | null>(null);
  readonly actionBusy = signal(false);

  readonly dataSource = new MatTableDataSource<Record<string, unknown>>([]);
  readonly pageSizeOptions = [10, 25, 50, 100];
  pageSize = 10;
  form = this.fb.group({});

  ngOnInit(): void {
    this.dataSource.filterPredicate = (row, filter) => this.rowMatches(row, filter);
    this.dataSource.sortingDataAccessor = (row, key) => this.sortValue(row, key);

    this.route.data.subscribe((data) => {
      const cfg = data['resource'] as ResourceConfig;
      if (!cfg) return;
      this.config.set(cfg);
      this.search.set('');
      this.dataSource.filter = '';
      this.reload();
    });
  }

  ngAfterViewInit(): void {
    this.bindTableControls();
  }

  displayedColumns(): string[] {
    return [...this.config().columns.map((c) => c.key), 'actions'];
  }

  activeFields(): ResourceField[] {
    return this.formMode() === 'create'
      ? this.config().createFields || []
      : this.config().editFields || [];
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.dataSource.filter = value.trim().toLowerCase();
    this.filteredCount.set(this.dataSource.filteredData.length);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  display(row: Record<string, unknown>, col: Col, index: number): string {
    if (col.type === 'serial' || col.key === '#') {
      const pageIndex = this.paginator?.pageIndex ?? 0;
      const size = this.paginator?.pageSize ?? this.pageSize;
      return String(pageIndex * size + index + 1);
    }
    return this.formatCell(row[col.key], col);
  }

  editLink(row: Record<string, unknown>): string {
    const id = String(row[this.config().idKey || 'id']);
    return (this.config().editRouteTemplate || '').replace(':id', id);
  }

  reload(): void {
    const cfg = this.config();
    // Load a large page so client-side DataTable can search/sort/paginate locally.
    const query = {
      page: 1,
      per_page: 500,
      ...(cfg.query || {}),
    };
    this.api.list(cfg.path, query).subscribe({
      next: (res) => {
        const data = (Array.isArray(res.data) ? res.data : []) as Record<string, unknown>[];
        const normalized = cfg.path === '/reviews'
          ? data.map((row) => ({
              ...row,
              review_snippet: row['review_snippet'] ?? row['review'] ?? '',
              status_label: row['status_label'] ?? row['approval_status'] ?? '',
            }))
          : data;
        this.dataSource.data = normalized;
        this.filteredCount.set(this.dataSource.filteredData.length);
        this.bindTableControls();
        if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
      },
      error: (err: unknown) =>
        this.snack.open(err instanceof Error ? err.message : 'Load failed', 'Close', { duration: 4000 }),
    });
  }

  openCreate(): void {
    this.formMode.set('create');
    this.editingId.set(null);
    this.buildForm(this.config().createFields || []);
    this.showForm.set(true);
  }

  openEdit(row: Record<string, unknown>): void {
    this.formMode.set('edit');
    const idKey = this.config().idKey || 'id';
    const id = String(row[idKey]);
    this.editingId.set(id);

    const openWith = (seed: Record<string, unknown>) => {
      const normalized = { ...seed };
      if (normalized['verification_status'] === 'blocked') {
        normalized['verification_status'] = 'rejected';
        normalized['is_active'] = false;
      }
      this.buildForm(this.config().editFields || [], normalized);
      this.showForm.set(true);
    };

    if (this.config().editFetchDetail) {
      this.api.get(`${this.config().path}/${id}`).subscribe({
        next: (res) => openWith((res.data as Record<string, unknown>) || row),
        error: (err: unknown) => {
          this.snack.open(err instanceof Error ? err.message : 'Failed to load record', 'Close');
          openWith(row);
        },
      });
      return;
    }
    openWith(row);
  }

  askDelete(row: Record<string, unknown>): void {
    this.deleteRow.set(row);
    document.body.style.overflow = 'hidden';
  }

  deleteTitle(): string {
    const title = this.config().title || 'record';
    const singular = title.endsWith('ies')
      ? `${title.slice(0, -3)}y`
      : title.endsWith('s')
        ? title.slice(0, -1)
        : title;
    return `Delete ${singular.toLowerCase()}?`;
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.deleteRow.set(null);
    document.body.style.overflow = '';
  }

  confirmDelete(): void {
    const row = this.deleteRow();
    if (!row) return;
    const cfg = this.config();
    const id = String(row[cfg.idKey || 'id']);
    const path = (cfg.deletePathTemplate || `${cfg.path}/:id`).replace(':id', id).replace(':key', id);
    this.deleting.set(true);
    this.api.remove(path).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteRow.set(null);
        document.body.style.overflow = '';
        this.snack.open('Deleted', 'OK', { duration: 2000 });
        this.reload();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Delete failed', 'Close');
      },
    });
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  submitForm(): void {
    const cfg = this.config();
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const body = this.coerceBody(raw, this.activeFields());
    if (this.formMode() === 'create') {
      const createPath = cfg.createPath || cfg.path;
      this.api.create(createPath, body).subscribe({
        next: () => {
          this.snack.open('Created', 'OK', { duration: 2000 });
          this.closeForm();
          this.reload();
        },
        error: (err: unknown) => this.snack.open(err instanceof Error ? err.message : 'Create failed', 'Close'),
      });
    } else {
      const id = this.editingId();
      const updatePath = (cfg.updatePathTemplate || `${cfg.path}/:id`)
        .replace(':id', id || '')
        .replace(':key', id || '');
      this.api.update(updatePath, body).subscribe({
        next: () => {
          this.snack.open('Updated', 'OK', { duration: 2000 });
          this.closeForm();
          this.reload();
        },
        error: (err: unknown) => this.snack.open(err instanceof Error ? err.message : 'Update failed', 'Close'),
      });
    }
  }

  runAction(row: Record<string, unknown>, action: NonNullable<ResourceConfig['rowActions']>[number]): void {
    if (action.confirm) {
      this.actionConfirm.set({ row, action });
      document.body.style.overflow = 'hidden';
      return;
    }
    this.executeAction(row, action);
  }

  cancelAction(): void {
    if (this.actionBusy()) return;
    this.actionConfirm.set(null);
    document.body.style.overflow = '';
  }

  confirmAction(): void {
    const pending = this.actionConfirm();
    if (!pending) return;
    this.executeAction(pending.row, pending.action, true);
  }

  private executeAction(
    row: Record<string, unknown>,
    action: NonNullable<ResourceConfig['rowActions']>[number],
    fromConfirm = false,
  ): void {
    const id = String(row['id']);
    const path = action.path.replace(':id', id);
    if (fromConfirm) this.actionBusy.set(true);
    this.api.action(path, action.body || {}).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.actionConfirm.set(null);
        document.body.style.overflow = '';
        this.snack.open(action.successMessage || 'Done', 'OK', { duration: 2500 });
        this.reload();
      },
      error: (err: unknown) => {
        this.actionBusy.set(false);
        this.snack.open(err instanceof Error ? err.message : 'Action failed', 'Close');
      },
    });
  }

  private bindTableControls(): void {
    queueMicrotask(() => {
      if (this.sort) this.dataSource.sort = this.sort;
      if (this.paginator) this.dataSource.paginator = this.paginator;
      this.filteredCount.set(this.dataSource.filteredData.length);
    });
  }

  private rowMatches(row: Record<string, unknown>, filter: string): boolean {
    if (!filter) return true;
    const haystack = this.config()
      .columns.filter((c) => c.type !== 'serial' && c.key !== '#')
      .map((c) => this.formatCell(row[c.key], c))
      .join(' ')
      .toLowerCase();
    return haystack.includes(filter);
  }

  private sortValue(row: Record<string, unknown>, key: string): string | number {
    const col = this.config().columns.find((c) => c.key === key);
    const value = row[key];
    if (col?.type === 'boolean' || typeof value === 'boolean') {
      return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
    }
    if (col?.type === 'currency' || typeof value === 'number') {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    if (value == null) return '';
    return String(value).toLowerCase();
  }

  private formatCell(value: unknown, col?: Col): string {
    if (value == null || value === '') return '—';
    if (col?.type === 'boolean' || typeof value === 'boolean') {
      return value === true || value === 1 || value === '1' || value === 'true' ? 'Yes' : 'No';
    }
    if (col?.type === 'currency' && (typeof value === 'number' || typeof value === 'string')) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '—';
      return `₹${n.toLocaleString('en-IN')}`;
    }
    if (col?.type === 'date') {
      return this.formatDateDdMmmYyyy(value);
    }
    if (col?.key === 'availability_status') {
      return availabilityLabel(String(value));
    }
    if (col?.key === 'online_status') {
      return onlineLabel(String(value));
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /** DD-MMM-YYYY e.g. 11-Aug-2026 */
  private formatDateDdMmmYyyy(value: unknown): string {
    const raw = String(value).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!m) return raw || '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = Number(m[2]) - 1;
    if (monthIdx < 0 || monthIdx > 11) return raw;
    return `${m[3]}-${months[monthIdx]}-${m[1]}`;
  }

  private buildForm(fields: ResourceField[], row?: Record<string, unknown>): void {
    const group: Record<string, unknown> = {};
    for (const f of fields) {
      group[f.key] = row?.[f.key] ?? f.defaultValue ?? '';
    }
    this.form = this.fb.group(group);
  }

  private coerceBody(raw: Record<string, unknown>, fields: ResourceField[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      let v = raw[f.key];
      if (f.type === 'number' && v !== '' && v != null) v = Number(v);
      if (f.type === 'boolean') v = v === true || v === 'true' || v === 1 || v === '1';
      if (f.type === 'select' && (v === 'true' || v === 'false')) v = v === 'true';
      if (v === '') v = f.nullable ? null : v;
      if (f.type === 'password' && (v == null || v === '')) continue;
      out[f.key] = v;
    }
    return out;
  }
}
