"use client";

import {
  Plane,
  ArrowRightLeft,
  Repeat,
  Mountain,
  Car,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

type Service = { icon: LucideIcon; title: string; body: string };

const services: Service[] = [
  { icon: Plane, title: "Airport Taxi", body: "Flight-tracked pickups and drops to Coimbatore International, day or night." },
  { icon: ArrowRightLeft, title: "One Way Taxi", body: "Pay only for the distance you travel. No return fare, no hidden charges." },
  { icon: Repeat, title: "Round Trip", body: "Your driver waits with you, all day, across multiple stops and cities." },
  { icon: Mountain, title: "Tour Packages", body: "Ooty, Kodaikanal, Munnar and Valparai itineraries crafted around you." },
  { icon: Car, title: "Local Taxi", body: "Hourly rentals inside Udumalpet, Pollachi and Coimbatore city limits." },
  { icon: Briefcase, title: "Corporate Taxi", body: "Monthly billing, verified chauffeurs and priority allocation for teams." },
];

export function Services() {
  return (
    <section id="services" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">Our services</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          Every kind of journey, <span className="text-brand">one standard</span>
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <article
                key={s.title}
                className="h-full rounded-2xl border border-border bg-card/70 p-6 hover:border-brand/40"
              >
                <span className="grid size-12 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-brand">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold sm:text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
