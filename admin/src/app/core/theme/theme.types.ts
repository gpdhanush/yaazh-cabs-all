export type ThemeMode = 'light' | 'dark';

export type AdminTheme = {
  mode: ThemeMode;
  primary: string;
  secondary: string;
  sidebar: string;
  header: string;
  background: string;
  card: string;
  radius: number;
  fontFamily: string;
  logoText: string;
  density: 'comfortable' | 'compact';
};

export const DEFAULT_THEME: AdminTheme = {
  mode: 'light',
  primary: '#7C3AED',
  secondary: '#111827',
  sidebar: '#F3F4F6',
  header: 'rgba(255,255,255,0.86)',
  background: '#F8FAFC',
  card: '#FFFFFF',
  radius: 10,
  fontFamily: 'Arimo, system-ui, sans-serif',
  logoText: 'Yaazh Cabs',
  density: 'comfortable',
};

/** Primary colour swatches for Appearance. */
export const THEME_COLOR_SWATCHES: Array<{ id: string; label: string; primary: string }> = [
  { id: 'blue', label: 'Blue', primary: '#2563EB' },
  { id: 'green', label: 'Green', primary: '#16A34A' },
  { id: 'purple', label: 'Purple', primary: '#7C3AED' },
  { id: 'orange', label: 'Orange', primary: '#EA580C' },
  { id: 'pink', label: 'Pink', primary: '#DB2777' },
  { id: 'red', label: 'Red', primary: '#DC2626' },
  { id: 'teal', label: 'Teal', primary: '#0D9488' },
  { id: 'indigo', label: 'Indigo', primary: '#4F46E5' },
  { id: 'cyan', label: 'Cyan', primary: '#0891B2' },
  { id: 'amber', label: 'Amber', primary: '#D97706' },
  { id: 'lime', label: 'Lime', primary: '#65A30D' },
  { id: 'emerald', label: 'Emerald', primary: '#059669' },
  { id: 'violet', label: 'Violet', primary: '#8B5CF6' },
  { id: 'rose', label: 'Rose', primary: '#E11D48' },
  { id: 'sky', label: 'Sky', primary: '#0284C7' },
  { id: 'royal', label: 'Royal', primary: '#1D4ED8' },
];

export const THEME_PRESETS: Array<{ id: string; label: string; theme: Partial<AdminTheme> }> =
  THEME_COLOR_SWATCHES.map((s) => ({
    id: s.id,
    label: s.label,
    theme: { primary: s.primary },
  }));
