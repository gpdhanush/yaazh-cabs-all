"use client";

import { useEffect } from "react";

/**
 * Clears leftover Workbox / vite-plugin-pwa service workers from other apps
 * that previously ran on the same origin (e.g. localhost:4000). Those SWs
 * request /src/main.tsx and /manifest.webmanifest and break the TanStack app.
 */
export function ClearStaleServiceWorkers() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => /workbox|precache|runtime|pwa|vite/i.test(k))
              .map((k) => caches.delete(k)),
          );
        }

        if (!cancelled && regs.length > 0 && !sessionStorage.getItem("yaazh-sw-cleared")) {
          sessionStorage.setItem("yaazh-sw-cleared", "1");
          // One soft reload so the page is no longer controlled by the old SW
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
