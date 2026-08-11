"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Users } from "lucide-react";
import sedan from "@/assets/car-sedan.jpg";
import mpv from "@/assets/car-mpv.jpg";
import suv from "@/assets/car-suv.jpg";
import tempo from "@/assets/car-tempo.jpg";
import { vehicles } from "@/lib/site-data";
import { getVehicleCategories, isApiConfigured, type VehicleCategory } from "@/lib/api";

function imageFor(slug: string, name: string) {
  const key = `${slug} ${name}`.toLowerCase();
  if (key.includes("tempo")) return tempo;
  if (key.includes("suv") || key.includes("crysta")) return suv;
  if (key.includes("ertiga") || key.includes("innova") || key.includes("mpv")) return mpv;
  return sedan;
}

function shortName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("sedan") || lower.includes("dzire")) return "Dzire";
  if (lower.includes("ertiga")) return "Ertiga";
  if (lower.includes("innova")) return "Innova";
  if (lower.includes("crysta")) return "Crysta";
  if (lower.includes("suv")) return "SUV";
  if (lower.includes("tempo")) return "Tempo Traveller";
  return name;
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
        name: shortName(c.name),
        tag: c.description || "AC cab",
        seats: c.seating_capacity,
        bags: bagsFrom(c.luggage_capacity, c.seating_capacity),
        perKm: c.one_way_rate_per_km,
        image: c.image_url || imageFor(c.slug, c.name),
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

  return (
    <section id="fleet" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">The fleet</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          Sanitised, serviced, <span className="text-brand">showroom clean</span>
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((v) => (
            <article
              key={v.id}
              className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-brand/50"
            >
              <div className="h-36 overflow-hidden rounded-xl bg-muted sm:h-40">
                <img
                  src={v.image}
                  alt={`${v.name} taxi available for booking`}
                  loading="lazy"
                  width={1024}
                  height={640}
                  className="size-full object-contain p-2"
                />
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold sm:text-xl">{v.name}</h3>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{v.tag}</p>
                </div>
                <p className="whitespace-nowrap rounded-md bg-primary px-2.5 py-1 font-data text-sm font-semibold text-primary-foreground">
                  ₹{v.perKm}/km
                </p>
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5 text-brand" /> {v.seats} seats
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-brand" /> {v.bags} bags
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
