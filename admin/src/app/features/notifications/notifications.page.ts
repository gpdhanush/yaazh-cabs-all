import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminApiService } from '../../core/api/admin-api.service';
import { ApiError } from '../../core/api/api.types';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';

type Audience = 'all_customers' | 'all_drivers' | 'customer' | 'driver';

type Person = {
  id: string;
  name: string;
  phone: string;
  is_active?: boolean;
};

type NotificationRow = {
  id: string;
  title: string | null;
  body: string;
  channel: string;
  delivery_status: string | null;
  recipient_type: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  sender_type: string;
  created_at: string;
};

const AUDIENCES: Array<{ value: Audience; label: string; hint: string; icon: string }> = [
  { value: 'all_customers', label: 'All customers', hint: 'Everyone with an active customer account', icon: 'groups' },
  { value: 'all_drivers', label: 'All drivers', hint: 'Everyone with an active driver account', icon: 'local_taxi' },
  { value: 'customer', label: 'One customer', hint: 'Search and pick a specific rider', icon: 'person' },
  { value: 'driver', label: 'One driver', hint: 'Search and pick a specific driver', icon: 'badge' },
];

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    DatePipe,
    TitleCasePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    YaModalPortalDirective,
  ],
  template: `
    <div class="page-wrap space-y-5">
      <div>
        <h2 class="page-title">Notifications</h2>
        <p class="page-subtitle">
          Push and in-app alerts to all customers, all drivers, or one person.
        </p>
      </div>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h3 class="page-title !text-lg">Compose</h3>
            <p class="page-subtitle">Shown in the customer / driver app inbox and as a push if the device is registered.</p>
          </div>
        </div>

        <form class="ya-page-card__body space-y-5" [formGroup]="form" (ngSubmit)="askSend()">
          <div>
            <p class="ya-label mb-2">Audience <span class="ya-req">*</span></p>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              @for (opt of audiences; track opt.value) {
                <button
                  type="button"
                  class="audience-card"
                  [class.audience-card--on]="audience() === opt.value"
                  (click)="selectAudience(opt.value)"
                >
                  <mat-icon>{{ opt.icon }}</mat-icon>
                  <span class="audience-card__label">{{ opt.label }}</span>
                  <span class="audience-card__hint">{{ opt.hint }}</span>
                </button>
              }
            </div>
          </div>

          @if (needsPerson()) {
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="person-search">
                {{ personKind() === 'customer' ? 'Customer' : 'Driver' }}
                <span class="ya-req">*</span>
              </label>
              <input
                id="person-search"
                class="ya-input"
                type="search"
                [value]="personQuery()"
                (input)="onPersonQuery($event)"
                [placeholder]="personKind() === 'customer' ? 'Type name or phone to search…' : 'Type driver name or phone…'"
                autocomplete="off"
              />
              @if (selectedPerson(); as person) {
                <div class="selected-chip">
                  <span>Selected: <strong>{{ person.name }}</strong> · {{ person.phone }}</span>
                  <button type="button" (click)="clearPerson()">Clear</button>
                </div>
              }
              <div class="person-list">
                @for (p of peopleResults(); track p.id) {
                  <button
                    type="button"
                    class="person-row"
                    [class.person-row--on]="form.controls.person_id.value === p.id"
                    (click)="pickPerson(p)"
                  >
                    <span>
                      <strong>{{ p.name }}</strong>
                      <span class="person-row__phone">{{ p.phone }}</span>
                    </span>
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                } @empty {
                  <p class="person-empty">
                    {{ peopleLoading() ? 'Searching…' : personQuery().trim() ? 'No matches.' : 'Type a name or phone number.' }}
                  </p>
                }
              </div>
            </div>
          }

          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="title">Title <span class="ya-req">*</span></label>
              <input
                id="title"
                class="ya-input"
                formControlName="title"
                maxlength="180"
                placeholder="e.g. Festival booking update"
              />
            </div>
            <div class="ya-field ya-field--stacked ya-field--full">
              <label class="ya-label" for="body">Message <span class="ya-req">*</span></label>
              <textarea
                id="body"
                class="ya-input ya-input--area"
                rows="4"
                formControlName="body"
                maxlength="2000"
                placeholder="Write the message that should appear in the app"
              ></textarea>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="sending() || form.invalid">
              {{ sending() ? 'Sending…' : 'Send notification' }}
            </button>
            <p class="text-sm" [style.color]="'var(--ya-muted, #64748b)'">{{ audienceSummary() }}</p>
          </div>
        </form>
      </div>

      <div class="table-card overflow-hidden">
        <div class="ya-datatable-toolbar">
          <div class="ya-datatable-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              class="ya-input"
              placeholder="Search title, recipient, phone…"
              [value]="tableSearch()"
              (input)="onTableSearch($event)"
              aria-label="Search notification log"
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select class="ya-input !w-auto !min-w-[10rem]" [value]="historyFilter()" (change)="onHistoryFilter($event)">
              <option value="">All recipients</option>
              <option value="customer">Customers</option>
              <option value="driver">Drivers</option>
            </select>
            <p class="ya-datatable-meta !m-0">
              {{ filteredCount() }} record{{ filteredCount() === 1 ? '' : 's' }}
            </p>
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="loadHistory()" [disabled]="historyLoading()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table mat-table [dataSource]="dataSource" matSort class="w-full min-w-[980px] ya-datatable">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="ya-cell-left">Message</th>
              <td mat-cell *matCellDef="let n" class="ya-cell-left">
                <p class="font-semibold">{{ n.title || 'Notification' }}</p>
                <p class="bk-table__sub line-clamp-2">{{ n.body }}</p>
              </td>
            </ng-container>

            <ng-container matColumnDef="recipient_name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="ya-cell-left">Recipient</th>
              <td mat-cell *matCellDef="let n" class="ya-cell-left">
                <p class="font-medium">{{ n.recipient_name || '—' }}</p>
                <p class="bk-table__sub">
                  {{ n.recipient_type | titlecase }}
                  @if (n.recipient_phone) {
                    · {{ n.recipient_phone }}
                  }
                </p>
              </td>
            </ng-container>

            <ng-container matColumnDef="channel">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Channel</th>
              <td mat-cell *matCellDef="let n">{{ n.channel }}</td>
            </ng-container>

            <ng-container matColumnDef="delivery_status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let n">
                <span class="status-pill" [attr.data-status]="n.delivery_status">{{ n.delivery_status || '—' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="created_at">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Sent</th>
              <td mat-cell *matCellDef="let n">{{ n.created_at | date: 'dd MMM, hh:mm a' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="ya-col-actions">Actions</th>
              <td mat-cell *matCellDef="let n" class="ya-col-actions">
                <button
                  mat-flat-button
                  class="ya-action-btn ya-action-btn--delete"
                  type="button"
                  (click)="askDelete(n)"
                >
                  Delete
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
          @if (filteredCount() === 0) {
            <div class="ya-datatable-empty">
              {{ historyLoading() ? 'Loading notifications…' : tableSearch() || historyFilter() ? 'No matching notifications.' : 'No notifications yet.' }}
            </div>
          }
        </div>

        <mat-paginator [pageSize]="10" [pageSizeOptions]="[10, 25, 50, 100]" [showFirstLastButtons]="true" />
      </div>
    </div>

    @if (confirmOpen()) {
      <div class="ya-modal-overlay" yaModalPortal (click)="cancelSend()" role="presentation">
        <div
          class="ya-confirm"
          (click)="$event.stopPropagation()"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ya-notify-title"
          aria-describedby="ya-notify-desc"
        >
          <div class="ya-confirm__icon ya-confirm__icon--primary" aria-hidden="true">
            <mat-icon>campaign</mat-icon>
          </div>
          <h3 id="ya-notify-title" class="ya-confirm__title">Send this notification?</h3>
          <p id="ya-notify-desc" class="ya-confirm__text">{{ confirmText() }}</p>
          <div class="ya-confirm__footer">
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="cancelSend()">Cancel</button>
            <button mat-flat-button class="ya-btn-primary" type="button" (click)="confirmSend()" [disabled]="sending()">
              {{ sending() ? 'Sending…' : 'Send now' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (deleteRow(); as row) {
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
          <h3 id="ya-delete-title" class="ya-confirm__title">Delete this notification?</h3>
          <p id="ya-delete-desc" class="ya-confirm__text">
            “{{ row.title || 'Notification' }}” for {{ row.recipient_name || row.recipient_type }} will be removed from the log.
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
  `,
  styles: `
    .audience-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.95rem 1rem;
      text-align: left;
      border: 1px solid var(--ya-border, #e2e8f0);
      border-radius: 14px;
      background: var(--ya-card, #fff);
      color: inherit;
      cursor: pointer;
    }
    .audience-card mat-icon {
      color: var(--ya-primary, #0f172a);
    }
    .audience-card--on {
      border-color: var(--ya-primary, #0f172a);
      box-shadow: 0 0 0 1px var(--ya-primary, #0f172a);
    }
    .audience-card__label {
      font-weight: 800;
      font-size: 0.95rem;
    }
    .audience-card__hint {
      font-size: 0.78rem;
      line-height: 1.35;
      color: var(--ya-muted, #64748b);
    }
    .selected-chip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 0.65rem;
      padding: 0.55rem 0.8rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--ya-primary, #0f172a) 8%, white);
      font-size: 0.88rem;
    }
    .selected-chip button {
      border: 0;
      background: transparent;
      color: var(--ya-primary, #0f172a);
      font-weight: 700;
      cursor: pointer;
    }
    .person-list {
      margin-top: 0.65rem;
      max-height: 220px;
      overflow: auto;
      border: 1px solid var(--ya-border, #e2e8f0);
      border-radius: 12px;
    }
    .person-row {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.7rem 0.9rem;
      text-align: left;
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--ya-border, #e2e8f0);
      cursor: pointer;
    }
    .person-row:last-child {
      border-bottom: 0;
    }
    .person-row--on {
      background: color-mix(in srgb, var(--ya-primary, #0f172a) 8%, white);
    }
    .person-row__phone {
      display: block;
      font-size: 0.78rem;
      color: var(--ya-muted, #64748b);
    }
    .person-empty {
      padding: 0.9rem;
      font-size: 0.85rem;
      color: var(--ya-muted, #64748b);
    }
    .status-pill {
      display: inline-flex;
      text-transform: capitalize;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      background: #e2e8f0;
    }
    .status-pill[data-status='sent'],
    .status-pill[data-status='delivered'] {
      background: #dcfce7;
      color: #166534;
    }
    .status-pill[data-status='failed'] {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-pill[data-status='queued'] {
      background: #fef3c7;
      color: #92400e;
    }
  `,
})
export class NotificationsPage implements OnInit, AfterViewInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly personSearch$ = new Subject<string>();

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly audiences = AUDIENCES;
  readonly columns = ['title', 'recipient_name', 'channel', 'delivery_status', 'created_at', 'actions'];
  readonly dataSource = new MatTableDataSource<NotificationRow>([]);
  readonly form = this.fb.nonNullable.group({
    person_id: [''],
    title: ['', [Validators.required, Validators.maxLength(180)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  readonly audience = signal<Audience>('all_customers');
  readonly sending = signal(false);
  readonly confirmOpen = signal(false);
  readonly peopleLoading = signal(false);
  readonly historyLoading = signal(false);
  readonly deleting = signal(false);
  readonly personQuery = signal('');
  readonly peopleResults = signal<Person[]>([]);
  readonly selectedPerson = signal<Person | null>(null);
  readonly tableSearch = signal('');
  readonly filteredCount = signal(0);
  readonly historyFilter = signal('');
  readonly deleteRow = signal<NotificationRow | null>(null);

  readonly needsPerson = computed(() => {
    const a = this.audience();
    return a === 'customer' || a === 'driver';
  });

  readonly personKind = computed(() => (this.audience() === 'driver' ? 'driver' : 'customer'));

  ngOnInit(): void {
    this.dataSource.filterPredicate = (row, filter) => this.rowMatches(row, filter);
    this.dataSource.sortingDataAccessor = (row, key) => {
      if (key === 'created_at') return new Date(row.created_at).getTime() || 0;
      return String((row as unknown as Record<string, unknown>)[key] ?? '');
    };
    this.personSearch$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.searchPeople(q));
    this.loadHistory();
  }

  ngAfterViewInit(): void {
    this.bindTableControls();
  }

  selectAudience(value: Audience): void {
    this.audience.set(value);
    this.form.patchValue({ person_id: '' });
    this.personQuery.set('');
    this.selectedPerson.set(null);
    this.peopleResults.set([]);
    if (value === 'customer' || value === 'driver') {
      this.searchPeople('');
    }
  }

  onPersonQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.personQuery.set(value);
    this.personSearch$.next(value.trim());
  }

  pickPerson(person: Person): void {
    this.form.patchValue({ person_id: person.id });
    this.selectedPerson.set(person);
  }

  clearPerson(): void {
    this.form.patchValue({ person_id: '' });
    this.selectedPerson.set(null);
  }

  audienceSummary(): string {
    const a = this.audience();
    if (a === 'all_customers') return 'Every active customer will receive this.';
    if (a === 'all_drivers') return 'Every active driver will receive this.';
    const person = this.selectedPerson();
    return person ? `Will send only to ${person.name}.` : 'Search and pick a recipient above.';
  }

  confirmText(): string {
    return `${this.form.controls.title.value}\n\n${this.audienceSummary()}`;
  }

  askSend(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.needsPerson() && !this.form.controls.person_id.value) {
      this.snack.open('Select a recipient first.', 'OK', { duration: 2800 });
      return;
    }
    this.confirmOpen.set(true);
  }

  cancelSend(): void {
    this.confirmOpen.set(false);
  }

  confirmSend(): void {
    this.confirmOpen.set(false);
    this.send();
  }

  onHistoryFilter(event: Event): void {
    this.historyFilter.set((event.target as HTMLSelectElement).value);
    this.loadHistory();
  }

  onTableSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.tableSearch.set(value);
    this.dataSource.filter = value.trim().toLowerCase();
    this.filteredCount.set(this.dataSource.filteredData.length);
    this.dataSource.paginator?.firstPage();
  }

  askDelete(row: NotificationRow): void {
    this.deleteRow.set(row);
  }

  cancelDelete(): void {
    this.deleteRow.set(null);
  }

  confirmDelete(): void {
    const row = this.deleteRow();
    if (!row) return;
    this.deleting.set(true);
    this.api.remove(`/notifications/${row.id}`).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteRow.set(null);
        this.snack.open('Notification deleted.', 'OK', { duration: 2200 });
        this.loadHistory();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.snack.open(err instanceof ApiError ? err.message : 'Delete failed.', 'OK', { duration: 3200 });
      },
    });
  }

  searchPeople(query: string): void {
    const kind = this.personKind();
    const path = kind === 'driver' ? '/drivers' : '/customers';
    this.peopleLoading.set(true);
    this.api.list(path, { page: 1, per_page: 40, q: query || undefined }).subscribe({
      next: (res) => {
        const rows = ((res.data as Person[] | null) ?? []).filter((p) => p.is_active !== false);
        this.peopleResults.set(rows);
        this.peopleLoading.set(false);
      },
      error: () => {
        this.peopleLoading.set(false);
        this.peopleResults.set([]);
        this.snack.open(`Could not load ${kind}s.`, 'OK', { duration: 2800 });
      },
    });
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    const filter = this.historyFilter();
    this.api.list('/notifications', filter ? { recipient_type: filter } : undefined).subscribe({
      next: (res) => {
        this.dataSource.data = (res.data as NotificationRow[] | null) ?? [];
        this.dataSource.filter = this.tableSearch().trim().toLowerCase();
        this.filteredCount.set(this.dataSource.filteredData.length);
        this.bindTableControls();
        this.dataSource.paginator?.firstPage();
        this.historyLoading.set(false);
      },
      error: (err: unknown) => {
        this.historyLoading.set(false);
        this.snack.open(err instanceof ApiError ? err.message : 'Could not load notifications.', 'OK', {
          duration: 3200,
        });
      },
    });
  }

  private send(): void {
    const value = this.form.getRawValue();
    const body: Record<string, unknown> = {
      audience: this.audience(),
      title: value.title.trim(),
      body: value.body.trim(),
    };
    if (this.audience() === 'customer') body['customer_id'] = value.person_id;
    if (this.audience() === 'driver') body['driver_id'] = value.person_id;

    this.sending.set(true);
    this.api.create('/notifications/send', body).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.snack.open(res.message || 'Notification sent.', 'OK', { duration: 3200 });
        this.form.patchValue({ title: '', body: '' });
        this.loadHistory();
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.snack.open(err instanceof ApiError ? err.message : 'Send failed.', 'OK', { duration: 3600 });
      },
    });
  }

  private bindTableControls(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  private rowMatches(row: NotificationRow, filter: string): boolean {
    if (!filter) return true;
    return [
      row.title,
      row.body,
      row.recipient_name,
      row.recipient_phone,
      row.recipient_type,
      row.channel,
      row.delivery_status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(filter);
  }
}
