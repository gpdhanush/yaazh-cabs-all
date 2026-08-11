import { Injectable, computed, effect, signal } from '@angular/core';
import { AdminTheme, DEFAULT_THEME, ThemeMode } from './theme.types';

const STORAGE_KEY = 'yaazh.admin.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<AdminTheme>(this.read());
  readonly theme = this.themeSignal.asReadonly();
  readonly isDark = computed(() => this.themeSignal().mode === 'dark');

  constructor() {
    effect(() => {
      const theme = this.themeSignal();
      this.apply(theme);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    });
  }

  patch(partial: Partial<AdminTheme>): void {
    this.themeSignal.update((t) => ({ ...t, ...partial }));
  }

  setMode(mode: ThemeMode): void {
    this.patch({
      mode,
      ...(mode === 'dark'
        ? {
            background: '#0F172A',
            card: '#1E293B',
            header: 'rgba(15,23,42,0.86)',
            sidebar: '#111827',
          }
        : {
            background: DEFAULT_THEME.background,
            card: DEFAULT_THEME.card,
            header: DEFAULT_THEME.header,
            sidebar: DEFAULT_THEME.sidebar,
          }),
    });
  }

  toggleMode(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  reset(): void {
    this.themeSignal.set({ ...DEFAULT_THEME });
  }

  private apply(theme: AdminTheme): void {
    const root = document.documentElement;
    const radius = Math.max(4, Math.min(24, Number(theme.radius) || 10));
    root.dataset['theme'] = theme.mode;
    root.style.setProperty('--ya-primary', theme.primary);
    root.style.setProperty('--ya-sidebar', theme.sidebar);
    root.style.setProperty('--ya-header', theme.header);
    root.style.setProperty('--ya-bg', theme.background);
    root.style.setProperty('--ya-card', theme.card);
    root.style.setProperty('--ya-radius', `${radius}px`);
    root.style.setProperty('--ya-font', theme.fontFamily);
    // Single brand colour — solid fill (no secondary/accent gradient)
    root.style.setProperty('--ya-gradient', theme.primary);
    root.style.setProperty('--mdc-typography-font-family', theme.fontFamily);
    for (const token of [
      'body-small',
      'body-medium',
      'body-large',
      'label-small',
      'label-medium',
      'label-large',
      'title-small',
      'title-medium',
      'title-large',
      'headline-small',
      'headline-medium',
      'headline-large',
      'display-small',
      'display-medium',
      'display-large',
    ]) {
      root.style.setProperty(`--mat-sys-${token}-font`, theme.fontFamily);
    }
    document.body.style.fontFamily = theme.fontFamily;
  }

  private read(): AdminTheme {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_THEME };
      const saved = JSON.parse(raw) as Partial<AdminTheme> & {
        secondary?: string;
        accent?: string;
      };
      const { secondary: _s, accent: _a, ...rest } = saved;
      const merged: AdminTheme = { ...DEFAULT_THEME, ...rest };
      merged.radius = Math.max(4, Math.min(24, Number(merged.radius) || DEFAULT_THEME.radius));
      const legacy = /Plus Jakarta|Manrope|Sora|Roboto/i.test(merged.fontFamily || '');
      if (!saved.fontFamily || legacy) {
        merged.fontFamily = DEFAULT_THEME.fontFamily;
      }
      return merged;
    } catch {
      return { ...DEFAULT_THEME };
    }
  }
}
