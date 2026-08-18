import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../core/theme/theme.service';
import { environment } from '../../environments/environment';
import { YaModalPortalDirective } from '../shared/ya-modal-portal.directive';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    YaModalPortalDirective,
  ],
  template: `
    <div class="shell" [class.sidebar-collapsed]="collapsed()">
      <aside class="shell-aside" [style.width.px]="collapsed() ? 84 : 268">
        <div class="shell-aside__top">
          <div class="shell-brand">
            <div class="shell-brand__mark" aria-hidden="true">YZ</div>
            @if (!collapsed()) {
              <div class="shell-brand__text">
                <p>{{ theme.theme().logoText }}</p>
                <span>Admin Console</span>
              </div>
            }
          </div>
          <button
            type="button"
            class="shell-collapse-btn"
            [matTooltip]="collapsed() ? 'Expand menu' : 'Collapse menu'"
            (click)="collapsed.set(!collapsed())"
          >
            <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        <nav class="shell-aside__nav">
          @for (item of auth.visibleNavItems(); track item.path) {
            <a
              class="nav-item"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="item.path === '/dashboard' ? { exact: true } : { exact: false }"
              [matTooltip]="collapsed() ? item.label : ''"
              matTooltipPosition="right"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              @if (!collapsed()) {
                <span>{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="shell-aside__foot">
          <button
            type="button"
            class="shell-logout-text"
            (click)="askLogout()"
            [matTooltip]="collapsed() ? 'Logout' : ''"
            matTooltipPosition="right"
          >
            <mat-icon>logout</mat-icon>
            @if (!collapsed()) {
              <span>Logout</span>
            }
          </button>
        </div>
      </aside>

      <div class="shell-main flex min-w-0 flex-1 flex-col">
        <header class="shell-header">
          <div class="shell-header__title min-w-0">
            <p class="shell-header__eyebrow">Control panel</p>
            <div class="shell-header__heading">
              <h1>{{ pageTitle() }}</h1>
            </div>
          </div>

          <div class="shell-header__actions">
            <button
              type="button"
              class="shell-icon-btn"
              matTooltip="Toggle theme"
              (click)="theme.toggleMode()"
            >
              <mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>

            <div class="shell-header__user">
              <span class="shell-header__avatar">{{ userInitials() }}</span>
              <div class="shell-header__user-meta">
                <p class="shell-header__user-name">{{ userDisplayName() }}</p>
                <p class="shell-header__user-time">{{ now | date: 'dd-MMM-yyyy hh:mm a' }}</p>
              </div>
            </div>
          </div>
        </header>

        <main class="shell-content flex-1 overflow-auto">
          <router-outlet />
        </main>

        <footer class="shell-footer">
          <p class="shell-footer__credit">
            Created by <strong>G.K. Tech.</strong>
          </p>
          <p class="shell-footer__version">v{{ appVersion }}</p>
        </footer>
      </div>
    </div>

    @if (logoutOpen()) {
      <div class="ya-modal-overlay" yaModalPortal (click)="cancelLogout()" role="presentation">
        <div
          class="ya-confirm"
          (click)="$event.stopPropagation()"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ya-logout-title"
          aria-describedby="ya-logout-desc"
        >
          <div class="ya-confirm__icon ya-confirm__icon--warn" aria-hidden="true">
            <mat-icon>logout</mat-icon>
          </div>
          <h3 id="ya-logout-title" class="ya-confirm__title">Sign out?</h3>
          <p id="ya-logout-desc" class="ya-confirm__text">
            You will need to sign in again to access the Yaazh admin console.
          </p>
          <div class="ya-confirm__footer">
            <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="cancelLogout()">
              Cancel
            </button>
            <button
              mat-flat-button
              class="ya-action-btn ya-action-btn--delete ya-confirm__danger"
              type="button"
              (click)="confirmLogout()"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly appName = environment.appName;
  readonly appVersion = environment.appVersion;
  readonly collapsed = signal(false);
  readonly logoutOpen = signal(false);
  readonly currentUrl = signal(this.router.url);
  readonly now = new Date();

  constructor() {
    if (this.auth.isAuthenticated() && this.auth.permissions() === undefined) {
      this.auth.ensurePermissionsLoaded().subscribe({ error: () => undefined });
    }
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set(e.urlAfterRedirects);
    });
  }

  pageTitle(): string {
    const hit = this.auth.visibleNavItems().find((i) => this.currentUrl().startsWith(i.path));
    return hit?.label || this.appName;
  }

  userDisplayName(): string {
    const email = this.auth.user()?.email ?? 'Admin';
    const local = email.split('@')[0] || email;
    return local.replace(/[._]/g, ' ');
  }

  userInitials(): string {
    const name = this.userDisplayName().trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'YA';
  }

  askLogout(): void {
    this.logoutOpen.set(true);
  }

  cancelLogout(): void {
    this.logoutOpen.set(false);
  }

  confirmLogout(): void {
    // Close + detach portal overlay first, then navigate to login.
    this.logoutOpen.set(false);
    queueMicrotask(() => this.auth.logout());
  }
}
