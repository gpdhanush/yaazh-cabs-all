"use client";

import { ArrowUpRight, Clock, Route } from "lucide-react";
import gallery1 from "@/assets/gallery-ooty.jpg";
import gallery2 from "@/assets/gallery-city.jpg";
import gallery3 from "@/assets/gallery-temple.jpg";
import gallery4 from "@/assets/gallery-lake.jpg";

const routes = [
  { from: "Udumalpet", to: "Pollachi", km: 38, mins: "45 min", price: 899, img: gallery1 },
  { from: "Udumalpet", to: "Coimbatore", km: 68, mins: "1 hr 20 min", price: 1499, img: gallery2 },
  { from: "Udumalpet", to: "Palani", km: 55, mins: "1 hr 5 min", price: 1249, img: gallery3 },
  { from: "Pollachi", to: "Coimbatore", km: 45, mins: "55 min", price: 999, img: gallery4 },
];

export function PopularRoutes() {
  return (
    <section id="routes" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary sm:text-[11px]">Popular routes</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
          Fixed fares on the <span className="text-gradient-gold">roads we know best</span>
        </h2>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          All prices include driver bata and an estimate for tolls.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {routes.map((r) => (
            <article
              key={`${r.from}-${r.to}`}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative h-40 sm:h-44">
                <img
                  src={r.img}
                  alt={`${r.from} to ${r.to} taxi route`}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-[image:var(--gradient-night)]" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-bold">
                  {r.from} <span className="text-primary">→</span> {r.to}
                </h3>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="size-3.5 text-primary" /> {r.km} km
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" /> {r.mins}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-display text-xl font-extrabold text-gradient-gold">
                    ₹{r.price.toLocaleString("en-IN")}
                  </p>
                  <a
                    href="#book"
                    aria-label={`Book ${r.from} to ${r.to}`}
                    className="grid size-10 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
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
