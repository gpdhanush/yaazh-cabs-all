import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { mediaUrl } from '../../core/api/media-url';

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
  imports: [FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule],
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
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="deleteGroup(group)">
              <mat-icon>delete</mat-icon>
              Delete group
            </button>
          </div>
          <div class="ya-page-card__body space-y-5">
            <div class="ya-field-grid cols-2">
              <div class="ya-field ya-field--stacked">
                <label class="ya-label" for="caption">Caption</label>
                <input id="caption" class="ya-input" [(ngModel)]="caption" placeholder="e.g. Sedan interior" />
              </div>
              <div class="ya-field ya-field--stacked">
                <label class="ya-label">Photo</label>
                <label class="ya-upload__btn inline-flex cursor-pointer items-center gap-2">
                  <mat-icon>upload</mat-icon>
                  {{ uploading() ? 'Uploading…' : 'Choose image' }}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden (change)="onFile($event)" />
                </label>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              @for (img of group.images; track img.id) {
                <figure class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img [src]="src(img.image_url)" [alt]="img.caption || group.title" class="aspect-[4/3] w-full object-cover" />
                  <figcaption class="flex items-center justify-between gap-2 px-2 py-2 text-xs">
                    <span class="truncate">{{ img.caption || 'No caption' }}</span>
                    <button type="button" class="text-red-600" (click)="deleteImage(img)" aria-label="Delete photo">
                      <mat-icon class="!text-base">close</mat-icon>
                    </button>
                  </figcaption>
                </figure>
              }
            </div>
            @if (!group.images.length) {
              <p class="page-subtitle">No photos in this group yet.</p>
            }
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

  deleteGroup(group: GalleryGroup): void {
    if (!confirm(`Delete group “${group.title}” and all its photos?`)) return;
    this.api.remove(`/gallery/groups/${group.id}`).subscribe({
      next: () => {
        const next = this.groups().filter((g) => g.id !== group.id);
        this.groups.set(next);
        this.selectedId.set(next[0]?.id ?? null);
        this.snack.open('Group deleted', 'OK', { duration: 2000 });
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Delete failed'),
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const group = this.selected();
    if (!file || !group) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Please choose an image file.');
      return;
    }
    const body = new FormData();
    body.append('file', file, file.name);
    this.uploading.set(true);
    this.error.set(null);
    this.api.upload('/uploads', body).subscribe({
      next: (res) => {
        const stored = res.data?.path || res.data?.url;
        if (!stored) {
          this.uploading.set(false);
          this.error.set('Upload did not return an image path.');
          return;
        }
        this.api
          .create('/gallery/images', {
            group_id: group.id,
            image_url: stored,
            caption: this.caption.trim() || null,
            display_order: group.images.length + 1,
          })
          .subscribe({
            next: (created) => {
              this.uploading.set(false);
              this.caption = '';
              const img = created.data as GalleryImage;
              this.groups.set(
                this.groups().map((g) => (g.id === group.id ? { ...g, images: [...g.images, img] } : g)),
              );
              this.snack.open('Photo added', 'OK', { duration: 2000 });
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
  }

  deleteImage(img: GalleryImage): void {
    if (!confirm('Delete this photo?')) return;
    this.api.remove(`/gallery/images/${img.id}`).subscribe({
      next: () => {
        this.groups.set(
          this.groups().map((g) =>
            g.id === img.group_id ? { ...g, images: g.images.filter((i) => i.id !== img.id) } : g,
          ),
        );
        this.snack.open('Photo deleted', 'OK', { duration: 2000 });
      },
      error: (err: unknown) => this.error.set(err instanceof Error ? err.message : 'Delete failed'),
    });
  }
}
