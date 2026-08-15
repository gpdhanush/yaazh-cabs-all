export const SITE_ORIGIN =
  (import.meta.env["VITE_SITE_URL"] as string | undefined)?.replace(/\/$/, "") || "https://yaazhcabs.in";

export const OG_IMAGE = `${SITE_ORIGIN}/og-cover.png`;

export const GA_MEASUREMENT_ID = (import.meta.env["VITE_GA_MEASUREMENT_ID"] as string | undefined)?.trim() || "";

export const GOOGLE_SITE_VERIFICATION =
  (import.meta.env["VITE_GOOGLE_SITE_VERIFICATION"] as string | undefined)?.trim() || "";

export const defaultOgMeta = [
  { property: "og:image", content: OG_IMAGE },
  { property: "og:image:width", content: "1536" },
  { property: "og:image:height", content: "1024" },
  { property: "og:image:alt", content: "Yaazh Cabs — taxi in Udumalpet" },
  { name: "twitter:image", content: OG_IMAGE },
];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
