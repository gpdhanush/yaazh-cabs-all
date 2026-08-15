"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Expand, Users, X } from "lucide-react";
import sedan from "@/assets/car-sedan.jpg";
import mpv from "@/assets/car-mpv.jpg";
import suv from "@/assets/car-suv.jpg";
import tempo from "@/assets/car-tempo.jpg";
import { vehicles, vehicleDisplayName } from "@/lib/site-data";
import { getVehicleCategories, isApiConfigured, mediaUrl, type VehicleCategory } from "@/lib/api";
import { Reveal } from "./motion-primitives";

function imageFor(slug: string, name: string) {
  const key = `${slug} ${name}`.toLowerCase();
  if (key.includes("tempo")) return tempo;
  if (key.includes("suv") || key.includes("crysta")) return suv;
  if (key.includes("ertiga") || key.includes("innova") || key.includes("mpv")) return mpv;
  return sedan;
}

function bagsFrom(luggage: string | null | undefined, seats: number) {
  if (!luggage) return Math.max(2, Math.round(seats / 2));
  const n = Number.parseInt(luggage, 10);
  return Number.isFinite(n) ? n : Math.max(2, Math.round(seats / 2));
}

type FleetCard = {
  id: string;
  name: string;
  tag: string;
  seats: number;
  bags: number;
  perKm: number;
  image: string;
};

export function Fleet() {
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) return;
    getVehicleCategories()
      .then(setCategories)
      .catch(() => {
        /* fallback */
      });
  }, []);

  const cards = useMemo<FleetCard[]>(() => {
    if (categories.length) {
      return categories.map((c) => ({
        id: c.id,
        name: vehicleDisplayName(c.name, c.seating_capacity),
        tag: c.description || "AC cab",
        seats: c.seating_capacity,
        bags: bagsFrom(c.luggage_capacity, c.seating_capacity),
        perKm: c.one_way_rate_per_km,
        image: mediaUrl(c.image_url) || imageFor(c.slug, c.name),
      }));
    }
    return vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      tag: v.tag,
      seats: v.seats,
      bags: v.bags,
      perKm: v.perKm,
      image: v.image,
    }));
  }, [categories]);

  const active = cards.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <section id="fleet" className="relative py-16 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_58%)]"
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">The fleet</p>
              <h2 className="mt-3 max-w-xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
                Sanitised, serviced, <span className="text-brand">showroom clean</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:text-right">
              AC chauffeur-driven cabs from Udumalpet. Tap a car for a closer look, then estimate your fare.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((v) => (
            <article
              key={v.id}
              className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] transition-all duration-500 hover:-translate-y-1.5 hover:border-brand/50 hover:shadow-[0_28px_70px_-32px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
            >
                <button
                  type="button"
                  onClick={() => setActiveId(v.id)}
                  className="relative aspect-[16/11] w-full overflow-hidden text-left"
                  aria-label={`View ${v.name} larger`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_78%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_52%),linear-gradient(180deg,color-mix(in_oklab,var(--foreground)_8%,transparent),transparent_40%),var(--muted)]"
                  />
                  <img
                    src={v.image}
                    alt={`${v.name} taxi available for booking`}
                    loading="lazy"
                    width={1280}
                    height={800}
                    className="absolute inset-0 size-full object-contain p-4 transition-transform duration-700 group-hover:scale-[1.06] sm:p-6"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 font-data text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--primary)_85%,transparent)]">
                    ₹{v.perKm}/km
                  </span>
                  <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-white/15 bg-background/40 text-foreground backdrop-blur-md transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Expand className="size-3.5" />
                  </span>
                </button>

                <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-4">
                  <h3 className="font-display text-xl font-bold leading-tight sm:text-[1.35rem]">{v.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                      <Users className="size-3.5 text-brand" /> {v.seats} seats
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                      <Briefcase className="size-3.5 text-brand" /> {v.bags} bags
                    </span>
                  </div>
                </div>
              </article>
          ))}
        </div>
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${active.name} preview`}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1220]/80 p-4 backdrop-blur-md"
          onClick={() => setActiveId(null)}
        >
          <button
            type="button"
            aria-label="Close car preview"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setActiveId(null)}
          >
            <X className="size-5" />
          </button>
          <figure
            className="relative w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-white/12 bg-[radial-gradient(ellipse_at_50%_80%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_55%),linear-gradient(180deg,#f8fafc,#ffffff)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.image}
              alt={`${active.name} taxi`}
              className="mx-auto max-h-[68vh] w-full object-contain p-5 sm:p-10"
            />
            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 bg-white/90 px-5 py-4 backdrop-blur-md">
              <div>
                <p className="font-display text-lg font-bold text-[#111827]">{active.name}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-[#6B7289]">
                  {active.seats} seats · {active.bags} bags · ₹{active.perKm}/km
                </p>
              </div>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
