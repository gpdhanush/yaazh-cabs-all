const HEX6 = /^#?([0-9a-fA-F]{6})$/;
const HEX3 = /^#?([0-9a-fA-F]{3})$/;

export function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const m6 = HEX6.exec(t);
  if (m6) return `#${m6[1]!.toLowerCase()}`;
  const m3 = HEX3.exec(t);
  if (m3) {
    const [r, g, b] = m3[1]!.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function rgb(hex: string): [number, number, number] | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const v = parseInt(n.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function mix(hex: string, toward: number, amount: number) {
  const c = rgb(hex);
  if (!c) return hex;
  return toHex(
    Math.round(c[0] + (toward - c[0]) * amount),
    Math.round(c[1] + (toward - c[1]) * amount),
    Math.round(c[2] + (toward - c[2]) * amount),
  );
}

function contrastOn(hex: string) {
  const c = rgb(hex);
  if (!c) return "#1f2933";
  const lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  return lum > 0.55 ? "#1f2933" : "#ffffff";
}

/** Apply admin brand colours to the public-site CSS tokens. Invalid hex is ignored. */
export function applyBrandColors(primaryRaw?: string | null, secondaryRaw?: string | null) {
  if (typeof document === "undefined") return;
  const primary = normalizeHex(primaryRaw);
  const secondary = normalizeHex(secondaryRaw);
  const root = document.documentElement;
  if (primary) {
    const dark = mix(primary, 0, 0.12);
    const soft = mix(primary, 255, 0.28);
    const [r, g, b] = rgb(primary) ?? [255, 193, 7];
    const [dr, dg, db] = rgb(dark) ?? [224, 168, 0];
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-dark", dark);
    root.style.setProperty("--color-primary", primary);
    root.style.setProperty("--color-primary-dark", dark);
    root.style.setProperty("--gold", primary);
    root.style.setProperty("--gold-soft", soft);
    root.style.setProperty("--brand", primary);
    root.style.setProperty("--color-brand", primary);
    root.style.setProperty("--ring", primary);
    root.style.setProperty("--sidebar-primary", primary);
    root.style.setProperty("--sidebar-ring", primary);
    root.style.setProperty("--chart-1", primary);
    root.style.setProperty("--primary-foreground", contrastOn(primary));
    root.style.setProperty("--sidebar-primary-foreground", contrastOn(primary));
    root.style.setProperty("--gradient-gold", `linear-gradient(135deg, ${soft} 0%, ${primary} 50%, ${dark} 100%)`);
    root.style.setProperty(
      "--shadow-glow",
      `0 0 0 1px rgb(${r} ${g} ${b} / 35%), 0 12px 28px -16px rgb(${dr} ${dg} ${db} / 45%)`,
    );
  }
  if (secondary) {
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--color-secondary", secondary);
    root.style.setProperty("--secondary-foreground", contrastOn(secondary));
    root.style.setProperty("--chart-5", secondary);
  }
}
