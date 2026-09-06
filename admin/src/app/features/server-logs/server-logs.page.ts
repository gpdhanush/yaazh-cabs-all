import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { ServerLog } from '../../core/api/api.types';
import { AuthService } from '../../core/auth/auth.service';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';

@Component({
  selector: 'app-server-logs-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatSnackBarModule, YaModalPortalDirective],
  template: `
    <div class="page-wrap space-y-4">
      <div class="page-heading-row">
        <div>
          <h2 class="page-title">Server logs</h2>
          <p class="page-subtitle">Sanitized tail of the API stderr log. Sensitive values are redacted.</p>
        </div>
        <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="load()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <div class="table-card server-log-card">
        <div class="server-log-card__meta">
          <span>{{ log()?.path || 'stderr.log' }}</span>
          @if (log()?.truncated) {
            <span class="chip tone-warn">Tail truncated to 100 KB</span>
          }
          @if (log()?.available) {
            <span>{{ formatBytes(log()?.size_bytes ?? 0) }}</span>
          }
        </div>

        @if (loading()) {
          <div class="ya-datatable-empty">Loading server log…</div>
        } @else if (errorMessage()) {
          <div class="ya-datatable-empty server-log-error">{{ errorMessage() }}</div>
        } @else if (!log()?.available) {
          <div class="ya-datatable-empty">The stderr log does not exist or has already been deleted.</div>
        } @else {
          <pre class="server-log-output">{{ log()?.content }}</pre>
        }

        <div class="server-log-card__footer">
          <span class="ya-datatable-meta">Read access: Super Admin permission</span>
          @if (auth.hasPermission('server_logs.delete')) {
            <button mat-flat-button class="ya-action-btn ya-action-btn--delete" type="button" (click)="openDelete()">
              <mat-icon>delete</mat-icon>
              Delete log
            </button>
          }
        </div>
      </div>
    </div>

    @if (deleteOpen()) {
      <div class="ya-modal-overlay" yaModalPortal (click)="closeDelete()" role="presentation">
        <div class="ya-confirm" (click)="$event.stopPropagation()" role="alertdialog" aria-modal="true">
          <div class="ya-confirm__icon ya-confirm__icon--warn" aria-hidden="true"><mat-icon>delete</mat-icon></div>
          <h3 class="ya-confirm__title">Delete stderr log?</h3>
          <p class="ya-confirm__text">This removes the server-side file. The API will not delete any other files.</p>
          <div class="ya-confirm__footer">
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="closeDelete()">Cancel</button>
            <button mat-flat-button class="ya-action-btn ya-action-btn--delete" type="button" (click)="deleteLog()" [disabled]="deleting()">
              {{ deleting() ? 'Deleting…' : 'Delete log' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .page-heading-row,
    .server-log-card__meta,
    .server-log-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .server-log-card__meta,
    .server-log-card__footer {
      padding: 16px 20px;
      color: var(--ya-text-muted, #64748b);
      font-size: 12px;
    }
    .server-log-card__meta { border-bottom: 1px solid var(--ya-border); }
    .server-log-card__footer { border-top: 1px solid var(--ya-border); }
    .server-log-output {
      min-height: 420px;
      max-height: 65vh;
      margin: 0;
      padding: 20px;
      overflow: auto;
      background: #101820;
      color: #d8e2e8;
      font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .server-log-error { color: var(--ya-danger, #b42318); }
    @media (max-width: 640px) {
      .page-heading-row, .server-log-card__footer { align-items: flex-start; flex-direction: column; }
      .server-log-card__footer button { width: 100%; }
    }
  `,
})
export class ServerLogsPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);
  readonly log = signal<ServerLog | null>(null);
  readonly loading = signal(false);
  readonly deleting = signal(false);
  readonly deleteOpen = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api.getStderrLog().subscribe({
      next: (value) => { this.log.set(value); this.loading.set(false); },
      error: (error: { error?: { message?: string }; message?: string }) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.message || error.message || 'Unable to read the server log.');
      },
    });
  }

  openDelete(): void { this.deleteOpen.set(true); }
  closeDelete(): void { if (!this.deleting()) this.deleteOpen.set(false); }

  deleteLog(): void {
    this.deleting.set(true);
    this.api.deleteStderrLog().subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.snack.open('Server log deleted.', 'Close', { duration: 3000 });
        this.load();
      },
      error: (error: { error?: { message?: string }; message?: string }) => {
        this.deleting.set(false);
        this.snack.open(error.error?.message || error.message || 'Unable to delete the server log.', 'Close', { duration: 4000 });
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(bytes < 1024 * 1024 ? 1 : 2)} MB`;
  }
}
