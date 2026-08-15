import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { AdminTheme, DEFAULT_THEME, ThemeMode } from './theme.types';

const STORAGE_KEY = 'yaazh.admin.theme';
const HEX6 = /^#?[0-9a-fA-F]{6}$/;
const HEX3 = /^#?[0-9a-fA-F]{3}$/;

export function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (HEX6.test(t)) return t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`;
  if (HEX3.test(t)) {
    const n = t.startsWith('#') ? t.slice(1) : t;
    return `#${n[0]}${n[0]}${n[1]}${n[1]}${n[2]}${n[2]}`.toLowerCase();
  }
  return null;
}

function contrastOn(hex: string): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return '#ffffff';
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#1f2933' : '#ffffff';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly themeSignal = signal<AdminTheme>(this.read());
  readonly theme = this.themeSignal.asReadonly();
  readonly isDark = computed(() => this.themeSignal().mode === 'dark');

  constructor() {
    effect(() => {
      const theme = this.themeSignal();
      this.apply(theme);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    });
    effect(() => {
      this.auth.isAuthenticated();
      untracked(() => this.loadBrandColors());
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
    this.loadBrandColors();
  }

  applyBrand(primary?: string | null, secondary?: string | null): void {
    const next: Partial<AdminTheme> = {};
    const p = normalizeHex(primary);
    const s = normalizeHex(secondary);
    if (p) next.primary = p;
    if (s) next.secondary = s;
    if (Object.keys(next).length) this.patch(next);
  }

  loadBrandColors(): void {
    if (!this.auth.isAuthenticated()) return;
    this.api.get<Array<{ key?: string; value?: string | null }>>('/api/v1/admin/settings').subscribe({
      next: (res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        const map = Object.fromEntries(rows.map((r) => [String(r.key ?? ''), String(r.value ?? '')]));
        this.applyBrand(map['admin_primary_color'], map['admin_secondary_color']);
      },
      error: () => {
        this.applyBrand(DEFAULT_THEME.primary, DEFAULT_THEME.secondary);
      },
    });
  }

  private apply(theme: AdminTheme): void {
    const root = document.documentElement;
    const radius = Math.max(4, Math.min(24, Number(theme.radius) || 10));
    root.dataset['theme'] = theme.mode;
    root.style.setProperty('--ya-primary', theme.primary);
    root.style.setProperty('--ya-on-primary', contrastOn(theme.primary));
    root.style.setProperty('--ya-secondary', theme.secondary);
    root.style.setProperty('--ya-on-secondary', contrastOn(theme.secondary));
    root.style.setProperty('--ya-sidebar', theme.sidebar);
    root.style.setProperty('--ya-header', theme.header);
    root.style.setProperty('--ya-bg', theme.background);
    root.style.setProperty('--ya-card', theme.card);
    root.style.setProperty('--ya-radius', `${radius}px`);
    root.style.setProperty('--ya-font', theme.fontFamily);
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
      const saved = JSON.parse(raw) as Partial<AdminTheme> & { accent?: string };
      const { accent: _a, ...rest } = saved;
      const merged: AdminTheme = { ...DEFAULT_THEME, ...rest };
      merged.radius = Math.max(4, Math.min(24, Number(merged.radius) || DEFAULT_THEME.radius));
      merged.primary = normalizeHex(merged.primary) ?? DEFAULT_THEME.primary;
      merged.secondary = normalizeHex(merged.secondary) ?? DEFAULT_THEME.secondary;
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
