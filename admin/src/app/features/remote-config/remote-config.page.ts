import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { YaImageCropperComponent } from '../../shared/ya-image-cropper.component';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';

type ValueType = 'boolean' | 'string' | 'number' | 'json';
type EditorKind = 'boolean' | 'text' | 'image' | 'number';
type AppType = 'all' | 'customer_app' | 'driver_app' | 'admin_web' | 'user_website';
type Platform = 'all' | 'android' | 'ios' | 'web';

type ConfigRow = {
  id: string;
  config_key: string;
  app_type: AppType;
  platform: Platform;
  value_type: ValueType;
  config_value: string;
  description: string;
  is_active: boolean;
  draft: string;
  dirty: boolean;
  saving: boolean;
};

const APP_META: Record<AppType, { title: string; hint: string; icon: string }> = {
  all: { title: 'All apps', hint: 'Shared flags and copy', icon: 'apps' },
  customer_app: { title: 'Customer app', hint: 'Rider booking app', icon: 'smartphone' },
  driver_app: { title: 'Driver app', hint: 'Fleet driver app', icon: 'local_taxi' },
  user_website: { title: 'Website', hint: 'Public booking site', icon: 'language' },
  admin_web: { title: 'Admin', hint: 'Admin dashboard', icon: 'admin_panel_settings' },
};

const APP_OPTIONS: Array<{ label: string; value: AppType }> = [
  { label: 'All apps', value: 'all' },
  { label: 'Customer app', value: 'customer_app' },
  { label: 'Driver app', value: 'driver_app' },
  { label: 'Website', value: 'user_website' },
  { label: 'Admin', value: 'admin_web' },
];

const PLATFORM_OPTIONS: Array<{ label: string; value: Platform }> = [
  { label: 'All platforms', value: 'all' },
  { label: 'Android', value: 'android' },
  { label: 'iOS', value: 'ios' },
  { label: 'Web', value: 'web' },
];

@Component({
  selector: 'app-remote-config-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    YaImageCropperComponent,
    YaModalPortalDirective,
  ],
  template: `
    <div class="page-wrap settings-page rc-page">
      <div class="settings-page__head">
        <div>
          <h2 class="page-title">Remote config</h2>
          <p class="page-subtitle">Feature flags, copy, and images for the customer app, driver app, and website.</p>
        </div>
        <button mat-flat-button class="ya-btn-primary" type="button" (click)="openCreate()">
          <mat-icon>add</mat-icon>
          Add value
        </button>
      </div>

      <div class="rc-filters">
        @for (opt of filterOptions; track opt.value) {
          <button
            type="button"
            class="rc-chip"
            [class.is-on]="filter() === opt.value"
            (click)="filter.set(opt.value)"
          >
            {{ opt.label }}
          </button>
        }
      </div>

      @if (error()) {
        <p class="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{{ error() }}</p>
      }

      @if (loading() && !rows().length) {
        <div class="settings-stack">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton h-40 rounded-xl"></div>
          }
        </div>
      } @else if (!groups().length) {
        <section class="settings-card rc-empty">
          <mat-icon>tune</mat-icon>
          <h3>No remote values yet</h3>
          <p>Add a boolean switch, a text field, or an image the apps can fetch.</p>
        </section>
      } @else {
        <div class="settings-stack">
          @for (group of groups(); track group.id) {
            <section class="settings-card">
              <div class="settings-card__head">
                <span class="settings-card__icon" aria-hidden="true">
                  <mat-icon>{{ group.icon }}</mat-icon>
                </span>
                <div>
                  <h3>{{ group.title }}</h3>
                  <p>{{ group.hint }} · {{ group.rows.length }} value{{ group.rows.length === 1 ? '' : 's' }}</p>
                </div>
              </div>

              <div class="rc-list">
                @for (row of group.rows; track row.id) {
                  <article class="rc-row" [class.is-dirty]="row.dirty" [class.is-off]="!row.is_active">
                    <div class="rc-row__meta">
                      <div class="rc-row__title-row">
                        <p class="rc-row__key">{{ labelFor(row.config_key) }}</p>
                        <span class="rc-pill">{{ platformLabel(row.platform) }}</span>
                      </div>
                      <p class="rc-row__code">{{ row.config_key }}</p>
                      @if (row.description) {
                        <p class="rc-row__desc">{{ row.description }}</p>
                      }
                    </div>

                    <div class="rc-row__editor">
                      @switch (kindOf(row)) {
                        @case ('boolean') {
                          <div class="rc-switch">
                            <span>{{ asBool(row.draft) ? 'On' : 'Off' }}</span>
                            <mat-slide-toggle
                              [checked]="asBool(row.draft)"
                              [disabled]="row.saving"
                              (change)="onBool(row, $event.checked)"
                            />
                          </div>
                        }
                        @case ('image') {
                          <div class="ya-upload rc-upload" [class.ya-upload--filled]="!!row.draft">
                            <div class="ya-upload__preview">
                              @if (row.draft) {
                                <img [src]="row.draft" [alt]="row.config_key" />
                              } @else {
                                <div class="ya-upload__placeholder">
                                  <mat-icon>add_photo_alternate</mat-icon>
                                </div>
                              }
                            </div>
                            <div class="ya-upload__body">
                              <p class="ya-upload__title">
                                {{ row.draft ? 'Replace image' : 'Upload image' }}
                              </p>
                              <p class="ya-upload__hint">PNG, JPG or WebP · cropped before upload</p>
                              <div class="ya-upload__actions">
                                <label class="ya-upload__btn">
                                  <mat-icon>{{ row.draft ? 'photo_camera' : 'upload' }}</mat-icon>
                                  {{ row.draft ? 'Change' : 'Choose image' }}
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    (change)="onImagePicked(row, $event)"
                                  />
                                </label>
                                @if (row.draft) {
                                  <button type="button" class="ya-upload__btn" (click)="clearImage(row)">
                                    <mat-icon>delete</mat-icon>
                                    Remove
                                  </button>
                                }
                              </div>
                              @if (uploadingId() === row.id) {
                                <p class="ya-upload__status">Uploading cropped image…</p>
                              }
                            </div>
                          </div>
                        }
                        @case ('number') {
                          <input
                            class="ya-field__control"
                            type="number"
                            [ngModel]="row.draft"
                            (ngModelChange)="onDraft(row.id, $event)"
                            (blur)="saveIfDirty(row)"
                          />
                        }
                        @default {
                          <input
                            class="ya-field__control"
                            type="text"
                            [ngModel]="row.draft"
                            (ngModelChange)="onDraft(row.id, $event)"
                            (blur)="saveIfDirty(row)"
                            [placeholder]="'Enter ' + labelFor(row.config_key).toLowerCase()"
                          />
                        }
                      }
                    </div>

                    <div class="rc-row__active">
                      <span>{{ row.is_active ? 'Active' : 'Off' }}</span>
                      <mat-slide-toggle
                        [checked]="row.is_active"
                        [disabled]="row.saving"
                        (change)="onActive(row, $event.checked)"
                      />
                    </div>
                  </article>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>

    @if (showCreate()) {
      <div class="ya-modal-overlay" yaModalPortal (click)="closeCreate()">
        <div class="ya-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="ya-modal__header">
            <div>
              <h3 class="ya-modal__title">Add remote value</h3>
              <p class="ya-modal__subtitle">Switches, text, or an image the apps can read.</p>
            </div>
            <button type="button" class="ya-modal__close" (click)="closeCreate()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form class="ya-modal__form" (ngSubmit)="create()">
            <div class="ya-modal__body ya-field-grid cols-2">
              <div class="ya-field ya-field--stacked ya-field--full">
                <label class="ya-label" for="rc-key">Key</label>
                <input
                  id="rc-key"
                  class="ya-input"
                  name="config_key"
                  [(ngModel)]="draftKey"
                  placeholder="home_offer_banner_text"
                  required
                />
              </div>

              <div class="ya-field ya-field--stacked ya-field--full">
                <span class="ya-label">Type</span>
                <div class="rc-type-picks">
                  @for (opt of typeOptions; track opt.value) {
                    <button
                      type="button"
                      class="rc-type-pick"
                      [class.is-on]="draftKind === opt.value"
                      (click)="draftKind = opt.value"
                    >
                      <mat-icon>{{ opt.icon }}</mat-icon>
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="ya-field ya-field--stacked">
                <label class="ya-label" for="rc-app">App</label>
                <select id="rc-app" class="ya-input" name="app_type" [(ngModel)]="draftApp">
                  @for (opt of APP_OPTIONS; track opt.value) {
                    <option [ngValue]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>

              <div class="ya-field ya-field--stacked">
                <label class="ya-label" for="rc-platform">Platform</label>
                <select id="rc-platform" class="ya-input" name="platform" [(ngModel)]="draftPlatform">
                  @for (opt of PLATFORM_OPTIONS; track opt.value) {
                    <option [ngValue]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>

              @if (draftKind === 'boolean') {
                <div class="ya-field ya-field--stacked ya-field--full">
                  <div class="settings-row__toggle">
                    <div>
                      <p class="settings-row__label">Default</p>
                      <p class="settings-row__hint">{{ draftBool ? 'Enabled' : 'Disabled' }}</p>
                    </div>
                    <mat-slide-toggle [checked]="draftBool" (change)="draftBool = $event.checked" />
                  </div>
                </div>
              } @else if (draftKind === 'text' || draftKind === 'number') {
                <div class="ya-field ya-field--stacked ya-field--full">
                  <label class="ya-label" for="rc-value">Value</label>
                  <input
                    id="rc-value"
                    class="ya-input"
                    [type]="draftKind === 'number' ? 'number' : 'text'"
                    name="config_value"
                    [(ngModel)]="draftValue"
                    [placeholder]="draftKind === 'number' ? '0' : 'Enter text'"
                  />
                </div>
              } @else {
                <div class="ya-field ya-field--stacked ya-field--full">
                  <p class="ya-label">Image</p>
                  <p class="rc-row__desc">Create the key first, then upload the image on the card.</p>
                </div>
              }

              <div class="ya-field ya-field--stacked ya-field--full">
                <label class="ya-label" for="rc-desc">Description</label>
                <input
                  id="rc-desc"
                  class="ya-input"
                  name="description"
                  [(ngModel)]="draftDescription"
                  placeholder="What this value controls"
                />
              </div>
            </div>

            <div class="ya-modal__footer">
              <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="closeCreate()">Cancel</button>
              <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="creating()">
                {{ creating() ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (cropSrc()) {
      <app-ya-image-cropper [src]="cropSrc()!" (applyCrop)="onCropApplied($event)" (cancel)="closeCropper()" />
    }
  `,
})
export class RemoteConfigPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);

  readonly APP_OPTIONS = APP_OPTIONS;
  readonly PLATFORM_OPTIONS = PLATFORM_OPTIONS;
  readonly filterOptions = [{ label: 'All', value: 'all' as const }, ...APP_OPTIONS.filter((o) => o.value !== 'all')];
  readonly typeOptions: Array<{ label: string; value: EditorKind; icon: string }> = [
    { label: 'Switch', value: 'boolean', icon: 'toggle_on' },
    { label: 'Text', value: 'text', icon: 'title' },
    { label: 'Image', value: 'image', icon: 'image' },
    { label: 'Number', value: 'number', icon: 'pin' },
  ];

  readonly rows = signal<ConfigRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal<AppType | 'all'>('all');
  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly uploadingId = signal<string | null>(null);
  readonly cropSrc = signal<string | null>(null);
  readonly imageIds = signal<Set<string>>(new Set());

  draftKey = '';
  draftKind: EditorKind = 'boolean';
  draftApp: AppType = 'all';
  draftPlatform: Platform = 'all';
  draftValue = '';
  draftBool = true;
  draftDescription = '';

  private cropObjectUrl: string | null = null;
  private cropTargetId: string | null = null;

  readonly groups = computed(() => {
    const filter = this.filter();
    const visible = this.rows().filter((row) => filter === 'all' || row.app_type === filter);
    const byApp = new Map<AppType, ConfigRow[]>();
    for (const row of visible) {
      const list = byApp.get(row.app_type) ?? [];
      list.push(row);
      byApp.set(row.app_type, list);
    }
    const order: AppType[] = ['all', 'customer_app', 'driver_app', 'user_website', 'admin_web'];
    return order
      .filter((id) => byApp.has(id))
      .map((id) => ({ id, ...APP_META[id], rows: byApp.get(id) ?? [] }));
  });

  ngOnInit(): void {
    this.reload();
  }

  labelFor(key: string): string {
    return key.replace(/_/g, ' ');
  }

  platformLabel(platform: Platform): string {
    return PLATFORM_OPTIONS.find((o) => o.value === platform)?.label ?? platform;
  }

  kindOf(row: ConfigRow): EditorKind {
    if (row.value_type === 'boolean') return 'boolean';
    if (row.value_type === 'number') return 'number';
    if (this.isImageRow(row)) return 'image';
    return 'text';
  }

  asBool(value: string): boolean {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }

  onBool(row: ConfigRow, checked: boolean): void {
    this.patch(row, { config_value: checked ? 'true' : 'false', draft: checked ? 'true' : 'false' }, true);
  }

  onActive(row: ConfigRow, checked: boolean): void {
    this.patch(row, { is_active: checked }, true);
  }

  onDraft(id: string, value: string): void {
    this.rows.update((list) =>
      list.map((r) => (r.id === id ? { ...r, draft: value, dirty: value !== r.config_value } : r)),
    );
  }

  saveIfDirty(row: ConfigRow): void {
    if (!row.dirty) return;
    this.patch(row, { config_value: row.draft }, true);
  }

  onImagePicked(row: ConfigRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.snack.open('Please choose an image file', 'Close');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snack.open('Image must be under 5 MB', 'Close');
      return;
    }
    this.closeCropper();
    this.cropTargetId = row.id;
    this.cropObjectUrl = URL.createObjectURL(file);
    this.cropSrc.set(this.cropObjectUrl);
  }

  onCropApplied(blob: Blob): void {
    const id = this.cropTargetId;
    this.closeCropper();
    if (!id) return;
    const body = new FormData();
    body.append('file', blob, `remote-config-${id}-${Date.now()}.jpg`);
    this.uploadingId.set(id);
    this.api.upload('/uploads', body).subscribe({
      next: (res) => {
        this.uploadingId.set(null);
        const url = (res.data as { url?: string } | undefined)?.url;
        if (!url) return;
        const row = this.rows().find((r) => r.id === id);
        if (!row) return;
        this.imageIds.update((set) => new Set(set).add(id));
        this.patch(row, { config_value: url, draft: url }, true);
      },
      error: (err: unknown) => {
        this.uploadingId.set(null);
        this.snack.open(err instanceof Error ? err.message : 'Image upload failed', 'Close');
      },
    });
  }

  clearImage(row: ConfigRow): void {
    this.patch(row, { config_value: '', draft: '' }, true);
  }

  closeCropper(): void {
    this.cropSrc.set(null);
    this.cropTargetId = null;
    if (this.cropObjectUrl) {
      URL.revokeObjectURL(this.cropObjectUrl);
      this.cropObjectUrl = null;
    }
  }

  openCreate(): void {
    this.draftKey = '';
    this.draftKind = 'boolean';
    this.draftApp = 'all';
    this.draftPlatform = 'all';
    this.draftValue = '';
    this.draftBool = true;
    this.draftDescription = '';
    this.showCreate.set(true);
  }

  closeCreate(): void {
    if (this.creating()) return;
    this.showCreate.set(false);
  }

  create(): void {
    const key = this.draftKey.trim();
    if (key.length < 2) {
      this.snack.open('Enter a config key', 'Close');
      return;
    }
    const valueType: ValueType =
      this.draftKind === 'boolean' ? 'boolean' : this.draftKind === 'number' ? 'number' : 'string';
    const configValue =
      this.draftKind === 'boolean' ? (this.draftBool ? 'true' : 'false') : this.draftKind === 'image' ? '' : this.draftValue;
    this.creating.set(true);
    this.api
      .create('/remote-config', {
        config_key: key,
        app_type: this.draftApp,
        platform: this.draftPlatform,
        value_type: valueType,
        config_value: configValue,
        description: this.draftDescription.trim() || null,
        is_active: true,
      })
      .subscribe({
        next: (res) => {
          this.creating.set(false);
          this.showCreate.set(false);
          const id = String((res.data as { id?: string } | undefined)?.id ?? '');
          if (id && this.draftKind === 'image') {
            this.imageIds.update((set) => new Set(set).add(id));
          }
          this.snack.open('Remote value created', 'OK', { duration: 1800 });
          this.reload();
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.snack.open(err instanceof Error ? err.message : 'Create failed', 'Close');
        },
      });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list('/remote-config').subscribe({
      next: (res) => {
        const data = (Array.isArray(res.data) ? res.data : []) as Array<Record<string, unknown>>;
        this.rows.set(
          data.map((raw) => {
            const value = raw['config_value'] == null ? '' : String(raw['config_value']);
            return {
              id: String(raw['id'] ?? ''),
              config_key: String(raw['config_key'] ?? ''),
              app_type: (raw['app_type'] as AppType) || 'all',
              platform: (raw['platform'] as Platform) || 'all',
              value_type: (raw['value_type'] as ValueType) || 'string',
              config_value: value,
              description: String(raw['description'] ?? ''),
              is_active: raw['is_active'] !== false,
              draft: value,
              dirty: false,
              saving: false,
            };
          }),
        );
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load remote config';
        this.error.set(message);
        this.loading.set(false);
        this.snack.open(message, 'Close');
      },
    });
  }

  private isImageRow(row: ConfigRow): boolean {
    if (this.imageIds().has(row.id)) return true;
    const key = row.config_key.toLowerCase();
    if (/(^|_)(image|banner|logo|photo|icon|artwork|splash)(_|$)/.test(key)) return true;
    const value = row.config_value.trim().toLowerCase();
    return /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(value) || value.includes('/uploads/');
  }

  private patch(row: ConfigRow, body: Partial<Pick<ConfigRow, 'config_value' | 'draft' | 'is_active'>>, persist: boolean): void {
    this.rows.update((list) =>
      list.map((r) =>
        r.id === row.id
          ? {
              ...r,
              ...body,
              dirty: persist ? false : (body.draft ?? r.draft) !== (body.config_value ?? r.config_value),
              saving: persist,
            }
          : r,
      ),
    );
    if (!persist) return;
    this.api
      .update(`/remote-config/${row.id}`, {
        config_value: body.config_value ?? row.draft,
        is_active: body.is_active ?? row.is_active,
      })
      .subscribe({
        next: () => {
          this.rows.update((list) =>
            list.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    config_value: body.config_value ?? r.config_value,
                    draft: body.draft ?? body.config_value ?? r.draft,
                    dirty: false,
                    saving: false,
                  }
                : r,
            ),
          );
        },
        error: (err: unknown) => {
          this.rows.update((list) => list.map((r) => (r.id === row.id ? { ...r, saving: false } : r)));
          this.snack.open(err instanceof Error ? err.message : 'Save failed', 'Close');
        },
      });
  }
}
