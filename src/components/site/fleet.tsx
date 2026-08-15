"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Expand, Users, X } from "lucide-react";
import sedan from "@/assets/car-sedan.jpg";
import mpv from "@/assets/car-mpv.jpg";
import suv from "@/assets/car-suv.jpg";
import tempo from "@/assets/car-tempo.jpg";
import { vehicles } from "@/lib/site-data";
import { getVehicleCategories, isApiConfigured, mediaUrl, type VehicleCategory } from "@/lib/api";

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
        name: c.name,
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
    <section id="fleet" className="relative overflow-hidden py-16 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">The fleet</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          Sanitised, serviced, <span className="text-brand">showroom clean</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Tap a car to view it full size. Every cab is AC, chauffeur-driven, and ready from Udumalpet.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((v) => (
            <article
              key={v.id}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_-28px_rgba(17,24,39,0.45)] transition-transform duration-300 hover:-translate-y-1"
            >
              <button
                type="button"
                onClick={() => setActiveId(v.id)}
                className="relative aspect-[16/10] w-full overflow-hidden bg-[linear-gradient(180deg,#f4f6fb_0%,#ffffff_55%,#eef1f6_100%)] text-left"
                aria-label={`View ${v.name} larger`}
              >
                <img
                  src={v.image}
                  alt={`${v.name} taxi available for booking`}
                  loading="lazy"
                  width={1280}
                  height={800}
                  className="absolute inset-0 size-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.06] sm:p-4"
                />
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#1F2933]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                  <Expand className="size-3" /> View
                </span>
                <span className="absolute bottom-3 left-3 rounded-full bg-primary px-2.5 py-1 font-data text-xs font-semibold text-primary-foreground shadow-sm">
                  ₹{v.perKm}/km
                </span>
              </button>

              <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                <div>
                  <h3 className="font-display text-lg font-bold leading-tight sm:text-xl">{v.name}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{v.tag}</p>
                </div>
                <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5 text-brand" /> {v.seats} seats
                  </span>
                  <span className="inline-flex items-center gap-1.5">
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1F2933]/80 p-4 backdrop-blur-sm"
          onClick={() => setActiveId(null)}
        >
          <button
            type="button"
            aria-label="Close car preview"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setActiveId(null)}
          >
            <X className="size-5" />
          </button>
          <figure
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.image}
              alt={`${active.name} taxi`}
              className="mx-auto max-h-[72vh] w-full object-contain p-4 sm:p-8"
            />
            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-white px-5 py-4">
              <div>
                <p className="font-display text-lg font-bold text-[#111827]">{active.name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#6B7289]">
                  {active.seats} seats · {active.bags} bags · ₹{active.perKm}/km
                </p>
              </div>
              <a
                href="#fare"
                onClick={() => setActiveId(null)}
                className="inline-flex rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#111827]"
              >
                Estimate fare
              </a>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
