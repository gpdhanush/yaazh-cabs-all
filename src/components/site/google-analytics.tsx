"use client";

import { useEffect } from "react";
import { GA_MEASUREMENT_ID, trackEvent } from "@/lib/analytics";

export function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest("a") : null;
      if (!el?.href) return;
      if (el.href.startsWith("tel:")) {
        trackEvent("click_to_call", { link_url: el.href });
      } else if (el.href.includes("wa.me") || el.href.includes("whatsapp.com")) {
        trackEvent("whatsapp_click", { link_url: el.href });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
