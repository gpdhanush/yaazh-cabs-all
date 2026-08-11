import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { FirebaseService } from './core/firebase/firebase.service';
import { ThemeService } from './core/theme/theme.service';
import { LoadingService } from './core/loading/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (loading.active()) {
      <div class="ya-loading-overlay" role="status" aria-live="polite" aria-label="Loading">
        <div class="ya-loading-card">
          <span class="ya-loading-spinner" aria-hidden="true"></span>
          <p>Loading…</p>
        </div>
      </div>
    }
  `,
})
export class App {
  /** Eagerly apply persisted theme CSS variables. */
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);
  readonly loading = inject(LoadingService);

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.firebase.start();
    }
  }
}
