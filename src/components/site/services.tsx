"use client";

import airportTaxi from "@/assets/services/airport-taxi.png";
import oneWayTaxi from "@/assets/services/one-way-taxi.png";
import roundTripTaxi from "@/assets/services/round-trip-taxi.png";
import tourPackages from "@/assets/services/tour-packages.png";
import localTaxi from "@/assets/services/local-taxi.png";
import corporateTaxi from "@/assets/services/corporate-taxi.png";
import { Reveal, StaggerGroup, StaggerItem } from "./motion-primitives";

type Service = { image: string; title: string; body: string };

const services: Service[] = [
  {
    image: airportTaxi,
    title: "Airport Taxi",
    body: "Flight-tracked pickups and drops to Coimbatore International. We wait if your flight is late — day or night.",
  },
  {
    image: oneWayTaxi,
    title: "One Way Taxi",
    body: "Book a drop across Tamil Nadu and South India. Pay only for the kilometres you travel — no return fare.",
  },
  {
    image: roundTripTaxi,
    title: "Round Trip",
    body: "Your chauffeur stays with you for the full itinerary. Multiple stops, same car, one transparent package.",
  },
  {
    image: tourPackages,
    title: "Tour Packages",
    body: "Hill roads to Ooty and Kodaikanal, temple towns like Madurai, or the coast at Pondicherry — planned around you.",
  },
  {
    image: localTaxi,
    title: "Local Taxi",
    body: "Hourly cabs inside Udumalpet, Pollachi and Coimbatore. Easy for errands, family visits and city hops.",
  },
  {
    image: corporateTaxi,
    title: "Corporate Taxi",
    body: "Verified chauffeurs, on-time airport runs and monthly billing for teams who travel on a schedule.",
  },
];

export function Services() {
  return (
    <section id="services" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">Our services</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Every kind of journey, <span className="text-brand">one standard</span>
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Most travellers in Tamil Nadu like the road for the scenery and the freedom to stop where they want. At
            Yaazh Cabs, that ride should feel like time with family — not a rushed commute. Book online in a few
            clicks, pick your car, and see the fare up front. Intercity drops across South India without paying for
            the empty return.
          </p>
        </Reveal>

        <StaggerGroup className="mt-10 grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <StaggerItem key={s.title}>
              <article className="group flex h-full items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-[0_12px_36px_-28px_rgba(17,24,39,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-brand/45 sm:gap-5 sm:p-5">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold tracking-tight sm:text-xl">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
                <div className="relative grid size-[112px] shrink-0 place-items-center sm:size-[136px]">
                  <span
                    aria-hidden
                    className="absolute inset-1 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_55%,transparent)_0%,transparent_72%)] opacity-80 blur-md transition-opacity group-hover:opacity-100"
                  />
                  <span className="relative size-[92px] overflow-hidden rounded-full ring-2 ring-primary/35 ring-offset-2 ring-offset-card sm:size-[112px]">
                    <img
                      src={s.image}
                      alt=""
                      width={224}
                      height={224}
                      className="size-full object-cover"
                    />
                  </span>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
