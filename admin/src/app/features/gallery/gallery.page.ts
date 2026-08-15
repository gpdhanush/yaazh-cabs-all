import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { mediaUrl } from '../../core/api/media-url';
import { YaModalPortalDirective } from '../../shared/ya-modal-portal.directive';

type GalleryImage = {
  id: string;
  group_id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_active: boolean;
};

type GalleryGroup = {
  id: string;
  slug: string;
  title: string;
  group_type: string;
  display_order: number;
  is_active: boolean;
  images: GalleryImage[];
};

const GROUP_TYPES = [
  { label: 'Cars — Outside', value: 'cars_outside' },
  { label: 'Cars — Inside', value: 'cars_inside' },
  { label: 'Destinations', value: 'destinations' },
  { label: 'Custom', value: 'custom' },
];

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule, YaModalPortalDirective],
  template: `
    <div class="page-wrap space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="page-title">Gallery</h2>
          <p class="page-subtitle">
            Group photos for the website — cars outside, cars inside, and destinations.
          </p>
        </div>
        <button mat-flat-button class="ya-btn-primary" type="button" (click)="showGroupForm.set(true)">
          Add group
        </button>
      </div>

      @if (error()) {
        <p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
      }

      @if (showGroupForm()) {
        <div class="ya-page-card">
          <div class="ya-page-card__header">
            <h3 class="page-title text-lg">New group</h3>
          </div>
          <div class="ya-page-card__body ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="group_title">Title <span class="ya-req">*</span></label>
              <input id="group_title" class="ya-input" [(ngModel)]="newGroupTitle" placeholder="e.g. Cars — Outside" />
            </div>
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="group_type">Type</label>
              <select id="group_type" class="ya-input" [(ngModel)]="newGroupType">
                @for (t of groupTypes; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>
            <div class="ya-field ya-field--full mt-2 flex gap-2">
              <button mat-flat-button class="ya-btn-primary" type="button" (click)="createGroup()" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Create group' }}
              </button>
              <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="showGroupForm.set(false)">
                Cancel
              </button>
            </div>
          </div>
        </div>
      }

      @if (!groups().length && !loading()) {
        <p class="page-subtitle">No groups yet. Create “Cars — Outside” and “Cars — Inside” to start uploading.</p>
      }

      <div class="flex flex-wrap gap-2">
        @for (g of groups(); track g.id) {
          <button
            type="button"
            class="rounded-full border px-4 py-2 text-sm font-medium"
            [class.border-[var(--ya-primary)]]="selectedId() === g.id"
            [style.background]="selectedId() === g.id ? 'var(--ya-primary)' : 'transparent'"
            [style.color]="selectedId() === g.id ? '#fff' : 'inherit'"
            (click)="selectGroup(g.id)"
          >
            {{ g.title }} ({{ g.images.length }})
          </button>
        }
      </div>

      @if (selected(); as group) {
        <div class="ya-page-card">
          <div class="ya-page-card__header flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="page-title text-lg">{{ group.title }}</h3>
              <p class="page-subtitle">Upload photos for this group. They appear on the public website gallery.</p>
            </div>
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="askDeleteGroup(group)">
              <mat-icon>delete</mat-icon>
              Delete group
            </button>
          </div>
          <div class="ya-page-card__body space-y-5">
            <div
              class="ya-upload"
              [class.ya-upload--filled]="dragOver() || uploading()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              <div class="ya-upload__preview">
                <div class="ya-upload__placeholder">
                  <mat-icon>{{ uploading() ? 'hourglass_top' : 'add_photo_alternate' }}</mat-icon>
                  <span>{{ uploading() ? 'Uploading…' : 'Drop photos here' }}</span>
                </div>
              </div>
              <div class="ya-upload__body">
                <p class="ya-upload__title">Add photos to {{ group.title }}</p>
                <p class="ya-upload__hint">
                  Drag and drop JPG, PNG or WebP, or choose files. Optional caption applies to this upload.
                </p>
                <div class="ya-field ya-field--stacked" style="margin-bottom: 0.75rem">
                  <label class="ya-label" for="caption">Caption (optional)</label>
                  <input
                    id="caption"
                    class="ya-input"
                    [(ngModel)]="caption"
                    placeholder="e.g. Outside front · Inside dashboard"
                  />
                </div>
                <div class="ya-upload__actions">
                  <label class="ya-upload__btn" [class.pointer-events-none]="uploading()">
                    <mat-icon>upload</mat-icon>
                    {{ uploading() ? 'Uploading…' : 'Choose photos' }}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      hidden
                      multiple
                      [disabled]="uploading()"
                      (change)="onFile($event)"
                    />
                  </label>
                </div>
                @if (uploading()) {
                  <p class="ya-upload__status">Please wait while photos are added to this group.</p>
                }
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              @for (img of group.images; track img.id) {
                <figure class="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                  <img
                    [src]="src(img.image_url)"
                    [alt]="img.caption || group.title"
                    class="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white text-red-600 shadow"
                    (click)="askDeleteImage(img)"
                    aria-label="Delete photo"
                  >
                    <mat-icon class="!text-[18px]">delete_outline</mat-icon>
                  </button>
                  <figcaption class="truncate px-3 py-2 text-xs text-slate-600">
                    {{ img.caption || 'No caption' }}
                  </figcaption>
                </figure>
              }
            </div>
            @if (!group.images.length) {
              <p class="page-subtitle">No photos in this group yet. Drop files above to start.</p>
            }
          </div>
        </div>
      }

      @if (pendingImage(); as img) {
        <div class="ya-modal-overlay" yaModalPortal (click)="cancelDelete()" role="presentation">
          <div
            class="ya-confirm"
            (click)="$event.stopPropagation()"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ya-del-photo-title"
            aria-describedby="ya-del-photo-desc"
          >
            <div class="ya-confirm__icon" aria-hidden="true">
              <mat-icon>delete_forever</mat-icon>
            </div>
            <h3 id="ya-del-photo-title" class="ya-confirm__title">Delete this photo?</h3>
            <p id="ya-del-photo-desc" class="ya-confirm__text">
              {{ img.caption || 'This photo' }} will be removed from the website gallery. This cannot be undone.
            </p>
            <img
              [src]="src(img.image_url)"
              [alt]="img.caption || 'Photo to delete'"
              class="mx-auto mt-1 max-h-36 w-full rounded-xl object-cover"
            />
            <div class="ya-confirm__footer">
              <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="cancelDelete()" [disabled]="deleting()">
                Cancel
              </button>
              <button
                mat-flat-button
                class="ya-action-btn ya-action-btn--delete ya-confirm__danger"
                type="button"
                (click)="confirmDeleteImage()"
                [disabled]="deleting()"
              >
                {{ deleting() ? 'Deleting…' : 'Delete photo' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (pendingGroup(); as group) {
        <div class="ya-modal-overlay" yaModalPortal (click)="cancelDelete()" role="presentation">
          <div
            class="ya-confirm"
            (click)="$event.stopPropagation()"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ya-del-group-title"
            aria-describedby="ya-del-group-desc"
          >
            <div class="ya-confirm__icon" aria-hidden="true">
              <mat-icon>folder_delete</mat-icon>
            </div>
            <h3 id="ya-del-group-title" class="ya-confirm__title">Delete group?</h3>
            <p id="ya-del-group-desc" class="ya-confirm__text">
              “{{ group.title }}” and all {{ group.images.length }} photo{{ group.images.length === 1 ? '' : 's' }}
              will be removed permanently.
            </p>
            <div class="ya-confirm__footer">
              <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="cancelDelete()" [disabled]="deleting()">
                Cancel
              </button>
              <button
                mat-flat-button
                class="ya-action-btn ya-action-btn--delete ya-confirm__danger"
                type="button"
                (click)="confirmDeleteGroup()"
                [disabled]="deleting()"
              >
                {{ deleting() ? 'Deleting…' : 'Delete group' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class GalleryPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);

  readonly groupTypes = GROUP_TYPES;
  readonly groups = signal<GalleryGroup[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly showGroupForm = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingImage = signal<GalleryImage | null>(null);
  readonly pendingGroup = signal<GalleryGroup | null>(null);
  readonly deleting = signal(false);
  readonly dragOver = signal(false);

  newGroupTitle = '';
  newGroupType = 'cars_outside';
  caption = '';

  ngOnInit(): void {
    this.reload();
  }

  selected(): GalleryGroup | null {
    const id = this.selectedId();
    return this.groups().find((g) => g.id === id) ?? this.groups()[0] ?? null;
  }

  src(url: string): string {
    return mediaUrl(url) ?? url;
  }

  selectGroup(id: string): void {
    this.selectedId.set(id);
  }

  reload(): void {
    this.loading.set(true);
    this.api.list('/gallery').subscribe({
      next: (res) => {
        this.loading.set(false);
        const rows = (res.data as GalleryGroup[]) ?? [];
        this.groups.set(rows);
        if (!this.selectedId() && rows[0]) this.selectedId.set(rows[0].id);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Failed to load gallery');
      },
    });
  }

  createGroup(): void {
    const title = this.newGroupTitle.trim();
    if (title.length < 2) {
      this.error.set('Enter a group title.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .create('/gallery/groups', {
        title,
        group_type: this.newGroupType,
        display_order: this.groups().length + 1,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.showGroupForm.set(false);
          this.newGroupTitle = '';
          const created = res.data as GalleryGroup;
          this.groups.set([...this.groups(), created]);
          this.selectedId.set(created.id);
          this.snack.open('Group created', 'OK', { duration: 2000 });
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(err instanceof Error ? err.message : 'Could not create group');
        },
      });
  }

  askDeleteGroup(group: GalleryGroup): void {
    this.pendingImage.set(null);
    this.pendingGroup.set(group);
  }

  askDeleteImage(img: GalleryImage): void {
    this.pendingGroup.set(null);
    this.pendingImage.set(img);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.pendingImage.set(null);
    this.pendingGroup.set(null);
  }

  confirmDeleteGroup(): void {
    const group = this.pendingGroup();
    if (!group) return;
    this.deleting.set(true);
    this.api.remove(`/gallery/groups/${group.id}`).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingGroup.set(null);
        const next = this.groups().filter((g) => g.id !== group.id);
        this.groups.set(next);
        this.selectedId.set(next[0]?.id ?? null);
        this.snack.open('Group deleted', 'OK', { duration: 2000 });
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.error.set(err instanceof Error ? err.message : 'Delete failed');
      },
    });
  }

  confirmDeleteImage(): void {
    const img = this.pendingImage();
    if (!img) return;
    this.deleting.set(true);
    this.api.remove(`/gallery/images/${img.id}`).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingImage.set(null);
        this.groups.set(
          this.groups().map((g) =>
            g.id === img.group_id ? { ...g, images: g.images.filter((i) => i.id !== img.id) } : g,
          ),
        );
        this.snack.open('Photo deleted', 'OK', { duration: 2000 });
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.error.set(err instanceof Error ? err.message : 'Delete failed');
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.uploadFiles(files);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.uploadFiles(files);
  }

  private uploadFiles(files: File[]): void {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      this.error.set('Please choose image files (JPG, PNG, WebP or GIF).');
      return;
    }
    const group = this.selected();
    if (!group) return;
    this.uploading.set(true);
    this.error.set(null);
    const run = (index: number) => {
      if (index >= images.length) {
        this.uploading.set(false);
        this.caption = '';
        this.snack.open(images.length === 1 ? 'Photo added' : `${images.length} photos added`, 'OK', {
          duration: 2000,
        });
        return;
      }
      const file = images[index]!;
      const body = new FormData();
      body.append('file', file, file.name);
      this.api.upload('/uploads', body).subscribe({
        next: (res) => {
          const stored = res.data?.path || res.data?.url;
          const current = this.selected();
          if (!stored || !current) {
            this.uploading.set(false);
            this.error.set('Upload did not return an image path.');
            return;
          }
          this.api
            .create('/gallery/images', {
              group_id: current.id,
              image_url: stored,
              caption: this.caption.trim() || null,
              display_order: current.images.length + 1,
            })
            .subscribe({
              next: (created) => {
                const img = created.data as GalleryImage;
                this.groups.set(
                  this.groups().map((g) => (g.id === current.id ? { ...g, images: [...g.images, img] } : g)),
                );
                run(index + 1);
              },
              error: (err: unknown) => {
                this.uploading.set(false);
                this.error.set(err instanceof Error ? err.message : 'Could not save photo');
              },
            });
        },
        error: (err: unknown) => {
          this.uploading.set(false);
          this.error.set(err instanceof Error ? err.message : 'Upload failed');
        },
      });
    };
    run(0);
  }
}
