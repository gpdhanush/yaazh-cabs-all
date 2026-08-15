import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { ThemeService, normalizeHex } from '../../core/theme/theme.service';
import { THEME_COLOR_SWATCHES } from '../../core/theme/theme.types';
import { AdminApiService } from '../../core/api/admin-api.service';

@Component({
  selector: 'app-theme-settings-page',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatSliderModule, MatSnackBarModule],
  template: `
    <div class="page-wrap settings-page">
      <div class="settings-page__head">
        <div class="appear-title">
          <span class="appear-title__icon" aria-hidden="true">
            <mat-icon>palette</mat-icon>
          </span>
          <div>
            <h2 class="page-title">Appearance</h2>
            <p class="page-subtitle">Admin panel colours. Public website colours are under Settings.</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="theme.reset()">Reset</button>
          <button mat-flat-button class="ya-btn-primary" type="button" (click)="saveBrand()">Save colours</button>
        </div>
      </div>

      <section class="settings-card appear-simple">
        <div class="appear-preview" aria-hidden="true">
          <div class="appear-preview__site" [style.background]="theme.theme().secondary">
            <span class="appear-preview__brand" [style.color]="theme.theme().primary">Yaazh Cabs</span>
            <span
              class="appear-preview__cta"
              [style.background]="theme.theme().primary"
            >Book now</span>
          </div>
          <p class="appear-preview__caption">Admin preview</p>
        </div>
        <div class="appear-simple__row">
          <div>
            <h3>Theme Mode</h3>
            <p>Choose between light and dark mode</p>
          </div>
          <select
            class="ya-field__control appear-simple__select"
            [ngModel]="theme.theme().mode"
            (ngModelChange)="theme.setMode($event)"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div class="appear-simple__block">
          <div class="mb-3">
            <h3>Theme Color</h3>
            <p>Primary colour for the admin web panel</p>
          </div>
          <div class="appear-swatch-grid">
            @for (swatch of swatches; track swatch.id) {
              <button
                type="button"
                class="appear-swatch"
                [class.is-active]="theme.theme().primary.toLowerCase() === swatch.primary.toLowerCase()"
                [style.background]="swatch.primary"
                [attr.title]="swatch.label"
                [attr.aria-label]="swatch.label"
                (click)="applySwatch(swatch.id)"
              >
                @if (theme.theme().primary.toLowerCase() === swatch.primary.toLowerCase()) {
                  <mat-icon>check</mat-icon>
                }
              </button>
            }
          </div>
          <div class="settings-row__color mt-3">
            <input
              class="settings-row__swatch"
              type="color"
              [ngModel]="theme.theme().primary"
              (ngModelChange)="setPrimary($event)"
              aria-label="Custom primary colour"
            />
            <input
              class="ya-field__control"
              [ngModel]="theme.theme().primary"
              (ngModelChange)="setPrimary($event)"
              spellcheck="false"
            />
          </div>
        </div>

        <div class="appear-simple__block">
          <div class="mb-3">
            <h3>Secondary colour</h3>
            <p>Used for dark admin surfaces such as the sidebar</p>
          </div>
          <div class="settings-row__color">
            <input
              class="settings-row__swatch"
              type="color"
              [ngModel]="theme.theme().secondary"
              (ngModelChange)="setSecondary($event)"
              aria-label="Secondary colour"
            />
            <input
              class="ya-field__control"
              [ngModel]="theme.theme().secondary"
              (ngModelChange)="setSecondary($event)"
              spellcheck="false"
            />
          </div>
        </div>

        <div class="appear-simple__block">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div>
              <h3>Border radius</h3>
              <p>Applies to cards, inputs, nav items, and buttons</p>
            </div>
            <strong>{{ theme.theme().radius }}px</strong>
          </div>
          <mat-slider min="4" max="24" step="1" discrete class="w-full">
            <input
              matSliderThumb
              [ngModel]="theme.theme().radius"
              (ngModelChange)="setRadius($event)"
            />
          </mat-slider>
          <div class="appear-radius-demo" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div class="appear-simple__block">
          <label class="settings-row__label" for="logo-text">Logo text</label>
          <input
            id="logo-text"
            class="ya-field__control"
            [ngModel]="theme.theme().logoText"
            (ngModelChange)="theme.patch({ logoText: $event })"
          />
        </div>
      </section>
    </div>
  `,
})
export class ThemeSettingsPage {
  readonly theme = inject(ThemeService);
  private readonly snack = inject(MatSnackBar);
  private readonly api = inject(AdminApiService);
  readonly swatches = THEME_COLOR_SWATCHES;

  applySwatch(id: string): void {
    const swatch = this.swatches.find((s) => s.id === id);
    if (!swatch) return;
    this.setPrimary(swatch.primary);
    this.api.update('/settings/admin_primary_color', { value: swatch.primary }).subscribe({
      error: () => this.snack.open('Could not save colour', 'Close'),
    });
  }

  setPrimary(value: string): void {
    const hex = normalizeHex(value);
    if (!hex) return;
    this.theme.patch({ primary: hex });
  }

  setSecondary(value: string): void {
    const hex = normalizeHex(value);
    if (!hex) return;
    this.theme.patch({ secondary: hex });
  }

  setRadius(value: number | string): void {
    const radius = Math.max(4, Math.min(24, Number(value) || 10));
    this.theme.patch({ radius });
  }

  saveBrand(): void {
    const { primary, secondary } = this.theme.theme();
    forkJoin([
      this.api.update('/settings/admin_primary_color', { value: primary }),
      this.api.update('/settings/admin_secondary_color', { value: secondary }),
    ]).subscribe({
      next: () => this.snack.open('Admin colours saved', 'OK', { duration: 2200 }),
      error: () => this.snack.open('Could not save admin colours', 'Close'),
    });
  }
}
