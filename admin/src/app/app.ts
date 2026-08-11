import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { FirebaseService } from './core/firebase/firebase.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  /** Eagerly apply persisted theme CSS variables. */
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.firebase.start();
    }
  }
}
