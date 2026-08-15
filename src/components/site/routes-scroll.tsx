"use client";

import { useEffect, useState } from "react";
import { Clock, Route } from "lucide-react";
import gallery2 from "@/assets/gallery-city.jpg";
import gallery3 from "@/assets/gallery-temple.jpg";
import gallery4 from "@/assets/gallery-lake.jpg";
import { BOOKING_FARE_NOTE, popularOneWayRoutes } from "@/lib/site-data";
import { getAppConfig, getRoutes, isApiConfigured, mediaUrl, type PublicRoute } from "@/lib/api";

const routeImages = [gallery3, gallery2, gallery3, gallery3, gallery4, gallery4, gallery2, gallery2, gallery2];

type Card = {
  id: string;
  from: string;
  to: string;
  price: number;
  km?: number;
  mins?: string;
  tag?: string;
  imageUrl?: string;
};

function formatMins(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return undefined;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

function mapRoutes(rows: PublicRoute[]): Card[] {
  return rows
    .map((r) => {
      const from = r.from?.trim() || "";
      const to = r.to?.trim() || "";
      let left = from;
      let right = to;
      if ((!left || !right) && r.title) {
        const parts = r.title.split(/\s+to\s+/i);
        if (parts.length >= 2) {
          left = left || parts[0]!.replace(/\s+cabs$/i, "").trim();
          right = right || parts.slice(1).join(" to ").replace(/\s+cabs$/i, "").trim();
        }
      }
      if (!left || !right) return null;

      const price =
        (r.amount != null && r.amount > 0 ? r.amount : null) ??
        (r.starting_fare && r.starting_fare > 0 ? r.starting_fare : 0);

      const card: Card = {
        id: r.id,
        from: left,
        to: right,
        price,
      };
      if (r.image_url) card.imageUrl = mediaUrl(r.image_url) ?? r.image_url;
      if (r.distance_km) card.km = r.distance_km;
      const mins = formatMins(r.duration_minutes);
      if (mins) card.mins = mins;
      const tag = r.tag || (r.is_popular ? "Popular" : undefined);
      if (tag) card.tag = tag;
      return card;
    })
    .filter((r): r is Card => r != null);
}

function fallbackCards(): Card[] {
  return popularOneWayRoutes.map((r, i) => {
    const card: Card = {
      id: `fallback-${i}`,
      from: r.from,
      to: r.to,
      price: r.price,
    };
    if (r.km != null) card.km = r.km;
    if (r.mins) card.mins = r.mins;
    if (r.tag) card.tag = r.tag;
    return card;
  });
}

export function PopularRoutes() {
  const [routes, setRoutes] = useState<Card[]>(fallbackCards());
  const [fareNote, setFareNote] = useState(BOOKING_FARE_NOTE);

  useEffect(() => {
    if (!isApiConfigured()) return;
    Promise.all([getRoutes({ popular: true, perPage: 30 }), getAppConfig().catch(() => null)])
      .then(([rows, config]) => {
        const mapped = mapRoutes(rows);
        if (mapped.length) setRoutes(mapped);
        const note = config?.settings?.["booking_fare_note"];
        if (note) setFareNote(note);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return (
    <section id="routes" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">Popular routes</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
          One-way special fares from <span className="text-brand">Udumalpet</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm text-body">
          Fixed one-way rates to Palani, Coimbatore, Madurai, Munnar, Tiruppur and more. Swift, Dzire &amp;
          Traveller available.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
          {fareNote}
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((r, i) => (
            <article key={r.id} className="group relative isolate overflow-hidden rounded-[1.35rem]">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={r.imageUrl || routeImages[i % routeImages.length]}
                  alt={`${r.from} to ${r.to} taxi route`}
                  loading="lazy"
                  className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F2933]/95 via-[#1F2933]/45 to-transparent" />
                {r.tag ? (
                  <span className="absolute left-3 top-3 bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    {r.tag}
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className="font-display text-xl font-bold leading-tight text-white sm:text-[1.35rem]">
                    {r.from}
                    <span className="mx-1.5 text-primary">→</span>
                    {r.to}
                  </h3>
                  {(r.km || r.mins) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
                      {r.km ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Route className="size-3.5 text-primary" /> {r.km} km
                        </span>
                      ) : null}
                      {r.mins ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5 text-primary" /> {r.mins}
                        </span>
                      ) : null}
                    </div>
                  )}
                  <p className="mt-3 inline-block bg-primary px-2.5 py-1 font-data text-base font-semibold text-primary-foreground sm:text-lg">
                    {r.price > 0 ? `₹${r.price.toLocaleString("en-IN")}` : "On request"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
