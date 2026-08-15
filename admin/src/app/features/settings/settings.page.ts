import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../core/api/admin-api.service';
import { ThemeService } from '../../core/theme/theme.service';

type SettingRow = {
  key: string;
  value: string;
  group: string;
  draft: string;
  dirty: boolean;
  saving: boolean;
};

const GROUP_META: Record<string, { title: string; hint: string; icon: string }> = {
  company: {
    title: 'Company & contact',
    hint: 'Public website and booking contact details',
    icon: 'business',
  },
  fare: {
    title: 'Fare notes',
    hint: 'Customer-facing fare disclaimers',
    icon: 'payments',
  },
  website: {
    title: 'Website credit',
    hint: 'Footer “Created by” line on the public site. The name opens the URL in a new tab.',
    icon: 'code',
  },
  branding: {
    title: 'Website colours',
    hint: 'Primary and secondary colours for the public booking site only.',
    icon: 'palette',
  },
};

const LABEL_MAP: Record<string, string> = {
  company_name: 'Company name',
  support_phone: 'Support phone',
  support_phone_secondary: 'Secondary phone',
  support_email: 'Support email',
  whatsapp_number: 'WhatsApp number',
  business_address: 'Business address',
  business_hours: 'Business hours',
  booking_fare_note: 'Booking fare note',
  maps_share_url: 'Maps share URL',
  map_lat: 'Map latitude',
  map_lng: 'Map longitude',
  created_by_name: 'Created by name',
  created_by_url: 'Created by website URL',
  primary_color: 'Website primary',
  secondary_color: 'Website secondary',
};

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatSnackBarModule],
  template: `
    <div class="page-wrap settings-page">
      <div class="settings-page__head">
        <div>
          <h2 class="page-title">Settings</h2>
          <p class="page-subtitle">Website and ops values used across Yaazh.</p>
        </div>
        <button
          mat-flat-button
          class="ya-btn-primary"
          type="button"
          (click)="saveAllDirty()"
          [disabled]="!dirtyCount() || savingAny()"
        >
          <mat-icon>save</mat-icon>
          @if (dirtyCount()) {
            Save {{ dirtyCount() }} change{{ dirtyCount() === 1 ? '' : 's' }}
          } @else {
            Saved
          }
        </button>
      </div>

      @if (error()) {
        <p class="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{{ error() }}</p>
      }

      @if (loading() && !rows().length) {
        <div class="settings-stack">
          @for (i of [1, 2]; track i) {
            <div class="skeleton h-40 rounded-xl"></div>
          }
        </div>
      } @else {
        <div class="settings-stack">
          @for (group of groups(); track group.id) {
            <section class="settings-card">
              <div class="settings-card__head">
                <span class="settings-card__icon" aria-hidden="true">
                  <mat-icon>{{ group.icon }}</mat-icon>
                </span>
                <div class="min-w-0 flex-1">
                  <h3>{{ group.title }}</h3>
                  <p>{{ group.hint }}</p>
                </div>
                @if (group.id === 'branding') {
                  <button
                    mat-stroked-button
                    class="ya-btn-ghost"
                    type="button"
                    (click)="resetWebsiteColours()"
                    [disabled]="savingAny()"
                  >
                    Reset
                  </button>
                }
              </div>

              <div class="settings-card__grid">
                @for (row of group.rows; track row.key) {
                  <div
                    class="settings-row"
                    [class.is-dirty]="row.dirty"
                    [class.is-toggle]="!isColor(row.key) && (isBoolean(row.draft) || isBoolean(row.value))"
                    [class.is-full]="isMultiline(row.key)"
                    [class.is-color]="isColor(row.key)"
                  >
                    @if (isColor(row.key)) {
                      <label class="settings-row__label" [attr.for]="'setting-' + row.key">
                        {{ labelFor(row.key) }}
                      </label>
                      <div class="settings-row__color">
                        <input
                          class="settings-row__swatch"
                          type="color"
                          [id]="'setting-swatch-' + row.key"
                          [ngModel]="colorInputValue(row.draft)"
                          (ngModelChange)="onDraft(row.key, $event)"
                          [disabled]="row.saving"
                        />
                        <input
                          class="ya-field__control"
                          [id]="'setting-' + row.key"
                          [ngModel]="row.draft"
                          (ngModelChange)="onDraft(row.key, $event)"
                          spellcheck="false"
                        />
                      </div>
                    } @else if (isBoolean(row.draft) || isBoolean(row.value)) {
                      <div class="settings-row__toggle">
                        <div>
                          <p class="settings-row__label">{{ labelFor(row.key) }}</p>
                          <p class="settings-row__hint">{{ boolHint(row.draft) }}</p>
                        </div>
                        <mat-slide-toggle
                          [checked]="asBool(row.draft)"
                          (change)="onBool(row.key, $event.checked)"
                          [disabled]="row.saving"
                        />
                      </div>
                    } @else {
                      <label class="settings-row__label" [attr.for]="'setting-' + row.key">
                        {{ labelFor(row.key) }}
                      </label>
                      @if (isMultiline(row.key)) {
                        <textarea
                          class="ya-field__control"
                          [id]="'setting-' + row.key"
                          rows="2"
                          [ngModel]="row.draft"
                          (ngModelChange)="onDraft(row.key, $event)"
                        ></textarea>
                      } @else {
                        <input
                          class="ya-field__control"
                          [id]="'setting-' + row.key"
                          [ngModel]="row.draft"
                          (ngModelChange)="onDraft(row.key, $event)"
                        />
                      }
                    }
                  </div>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class SettingsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly theme = inject(ThemeService);

  readonly rows = signal<SettingRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dirtyCount = computed(() => this.rows().filter((r) => r.dirty).length);
  readonly savingAny = computed(() => this.rows().some((r) => r.saving));

  readonly groups = computed(() => {
    const byGroup = new Map<string, SettingRow[]>();
    for (const row of this.rows()) {
      const g = row.group || 'other';
      const list = byGroup.get(g) ?? [];
      list.push(row);
      byGroup.set(g, list);
    }
    return [...byGroup.entries()].map(([id, groupRows]) => {
      const meta = GROUP_META[id] ?? {
        title: id.charAt(0).toUpperCase() + id.slice(1),
        hint: 'Application settings',
        icon: 'tune',
      };
      return { id, ...meta, rows: groupRows };
    });
  });

  ngOnInit(): void {
    this.reload();
  }

  labelFor(key: string): string {
    return LABEL_MAP[key] ?? key.replace(/_/g, ' ');
  }

  isMultiline(key: string): boolean {
    return key.includes('note') || key.includes('address') || key.includes('message');
  }

  isColor(key: string): boolean {
    return key.endsWith('_color');
  }

  colorInputValue(value: string): string {
    const t = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
    if (/^#[0-9a-fA-F]{3}$/.test(t)) {
      return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`;
    }
    return '#ffc107';
  }

  isBoolean(value: string): boolean {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === 'false' || v === '1' || v === '0' || v === 'yes' || v === 'no';
  }

  asBool(value: string): boolean {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }

  boolHint(value: string): string {
    return this.asBool(value) ? 'Enabled' : 'Disabled';
  }

  onBool(key: string, checked: boolean): void {
    const row = this.rows().find((r) => r.key === key);
    if (!row) return;
    const raw = row.value.trim().toLowerCase();
    let next = checked ? 'true' : 'false';
    if (raw === '1' || raw === '0') next = checked ? '1' : '0';
    if (raw === 'yes' || raw === 'no') next = checked ? 'yes' : 'no';
    this.onDraft(key, next);
  }

  onDraft(key: string, value: string): void {
    this.rows.update((list) =>
      list.map((r) =>
        r.key === key
          ? {
              ...r,
              draft: value,
              dirty: value !== r.value,
            }
          : r,
      ),
    );
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get('/settings').subscribe({
      next: (res) => {
        const data = (Array.isArray(res.data) ? res.data : []) as Array<{
          key?: string;
          value?: string;
          group?: string;
        }>;
        this.rows.set(
          data
            .filter((r) => {
              const key = String(r.key ?? '');
              const group = String(r.group ?? 'other');
              return group !== 'admin_branding' && !key.startsWith('admin_');
            })
            .map((r) => {
            const value = String(r.value ?? '');
            return {
              key: String(r.key ?? ''),
              value,
              group: String(r.group ?? 'other'),
              draft: value,
              dirty: false,
              saving: false,
            };
          }),
        );
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load settings';
        this.error.set(message);
        this.loading.set(false);
        this.snack.open(message, 'Close');
      },
    });
  }

  resetWebsiteColours(): void {
    const defaults: Record<string, string> = {
      primary_color: '#ffc107',
      secondary_color: '#1f2933',
    };
    const keys = Object.keys(defaults);
    for (const key of keys) this.setSaving(key, true);
    this.rows.update((list) =>
      list.map((r) => {
        const next = defaults[r.key];
        if (!next) return r;
        return { ...r, draft: next, dirty: r.value !== next, saving: true };
      }),
    );
    forkJoin(keys.map((key) => this.api.update(`/settings/${encodeURIComponent(key)}`, { value: defaults[key] }))).subscribe({
      next: () => {
        this.rows.update((list) =>
          list.map((r) => {
            const next = defaults[r.key];
            if (!next) return r;
            return { ...r, value: next, draft: next, dirty: false, saving: false };
          }),
        );
        this.snack.open('Website colours reset', 'OK', { duration: 1800 });
      },
      error: () => {
        for (const key of keys) this.setSaving(key, false);
        this.snack.open('Could not reset website colours', 'Close');
      },
    });
  }

  saveAllDirty(): void {
    const dirty = this.rows().filter((r) => r.dirty);
    if (!dirty.length) {
      this.snack.open('No changes to save', 'OK', { duration: 1600 });
      return;
    }
    let left = dirty.length;
    for (const row of dirty) {
      this.setSaving(row.key, true);
      this.api.update(`/settings/${encodeURIComponent(row.key)}`, { value: row.draft }).subscribe({
        next: () => {
          this.rows.update((list) =>
            list.map((r) =>
              r.key === row.key ? { ...r, value: r.draft, dirty: false, saving: false } : r,
            ),
          );
          this.applyBrandIfNeeded(row.key, row.draft);
          left -= 1;
          if (left === 0) this.snack.open('Settings saved', 'OK', { duration: 1800 });
        },
        error: (err: unknown) => {
          this.setSaving(row.key, false);
          const message = err instanceof Error ? err.message : 'Save failed';
          this.snack.open(message, 'Close');
        },
      });
    }
  }

  private applyBrandIfNeeded(key: string, value: string): void {
    if (key === 'admin_primary_color') this.theme.applyBrand(value, null);
    if (key === 'admin_secondary_color') this.theme.applyBrand(null, value);
  }

  private setSaving(key: string, saving: boolean): void {
    this.rows.update((list) => list.map((r) => (r.key === key ? { ...r, saving } : r)));
  }
}
