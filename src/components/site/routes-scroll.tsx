"use client";

import { ArrowUpRight, Clock, Route } from "lucide-react";
import gallery1 from "@/assets/gallery-ooty.jpg";
import gallery2 from "@/assets/gallery-city.jpg";
import gallery3 from "@/assets/gallery-temple.jpg";
import gallery4 from "@/assets/gallery-lake.jpg";
import { BOOKING_FARE_NOTE, popularOneWayRoutes } from "@/lib/site-data";

const routeImages = [gallery3, gallery2, gallery3, gallery3, gallery4, gallery4, gallery2, gallery2, gallery2];

export function PopularRoutes() {
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
          {BOOKING_FARE_NOTE}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularOneWayRoutes.map((r, i) => (
            <article
              key={`${r.from}-${r.to}`}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className="relative h-36 sm:h-40">
                <img
                  src={routeImages[i % routeImages.length]}
                  alt={`${r.from} to ${r.to} taxi route`}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-[image:var(--gradient-night)]" />
                {r.tag ? (
                  <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    {r.tag}
                  </span>
                ) : null}
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-foreground">
                  {r.from} <span className="text-brand">→</span> {r.to}
                </h3>
                {(r.km || r.mins) && (
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    {r.km ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Route className="size-3.5 text-brand" /> {r.km} km
                      </span>
                    ) : null}
                    {r.mins ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5 text-brand" /> {r.mins}
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <p className="rounded-md bg-primary px-2.5 py-1 font-data text-lg font-semibold text-primary-foreground">
                    ₹{r.price.toLocaleString("en-IN")}
                  </p>
                  <a
                    href="#book"
                    aria-label={`Book ${r.from} to ${r.to}`}
                    className="grid size-10 place-items-center rounded-full border border-brand/40 bg-brand/10 text-brand hover:bg-primary hover:text-primary-foreground"
                  >
                    <ArrowUpRight className="size-5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
