"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Clock, Route } from "lucide-react";
import gallery1 from "@/assets/gallery-ooty.jpg";
import gallery2 from "@/assets/gallery-city.jpg";
import gallery3 from "@/assets/gallery-temple.jpg";
import gallery4 from "@/assets/gallery-lake.jpg";
import { Magnetic, Reveal } from "./motion-primitives";

const routes = [
  { from: "Udumalpet", to: "Pollachi", km: 38, mins: "45 min", price: 899, img: gallery1 },
  { from: "Udumalpet", to: "Coimbatore", km: 68, mins: "1 hr 20 min", price: 1499, img: gallery2 },
  { from: "Udumalpet", to: "Palani", km: 55, mins: "1 hr 5 min", price: 1249, img: gallery3 },
  { from: "Pollachi", to: "Coimbatore", km: 45, mins: "55 min", price: 999, img: gallery4 },
];

export function PopularRoutes() {
  return (
    <section id="routes" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-primary">Popular routes</p>
            <h2 className="mt-4 font-display text-4xl font-extrabold md:text-5xl">
              Fixed fares on the <span className="text-gradient-gold">roads we know best</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Drag sideways to explore. All prices include driver bata and tolls estimate.
          </p>
        </Reveal>
      </div>

      <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 md:px-8">
        {routes.map((r, i) => (
          <motion.article
            key={`${r.from}-${r.to}`}
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.75, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.015 }}
            className="group relative w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl p-px sm:w-[380px]"
            style={{
              backgroundImage:
                "linear-gradient(140deg, color-mix(in oklab, var(--gold) 55%, transparent), transparent 45%, color-mix(in oklab, var(--gold) 25%, transparent))",
            }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-card">
              <div className="relative h-52 overflow-hidden">
                <img
                  src={r.img}
                  alt={`${r.from} to ${r.to} taxi route`}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-[900ms] ease-[var(--ease-lux)] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-[image:var(--gradient-night)]" />
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl font-bold">
                  {r.from} <span className="text-primary">→</span> {r.to}
                </h3>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="size-3.5 text-primary" /> {r.km} km
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" /> {r.mins}
                  </span>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <p className="font-display text-2xl font-extrabold text-gradient-gold">
                    ₹{r.price.toLocaleString("en-IN")}
                  </p>
                  <Magnetic strength={0.4}>
                    <a
                      href="#top"
                      aria-label={`Book ${r.from} to ${r.to}`}
                      className="grid size-11 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <ArrowUpRight className="size-5" />
                    </a>
                  </Magnetic>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
