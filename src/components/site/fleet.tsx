"use client";

import { Briefcase, Users } from "lucide-react";
import { vehicles } from "@/lib/site-data";

export function Fleet() {
  return (
    <section id="fleet" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">The fleet</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          Sanitised, serviced, <span className="text-brand">showroom clean</span>
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
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
