"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Plane,
  ArrowRightLeft,
  Repeat,
  Mountain,
  Car,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./motion-primitives";

type Service = { icon: LucideIcon; title: string; body: string };

const services: Service[] = [
  { icon: Plane, title: "Airport Taxi", body: "Flight-tracked pickups and drops to Coimbatore International, day or night." },
  { icon: ArrowRightLeft, title: "One Way Taxi", body: "Pay only for the distance you travel. No return fare, no hidden charges." },
  { icon: Repeat, title: "Round Trip", body: "Your driver waits with you, all day, across multiple stops and cities." },
  { icon: Mountain, title: "Tour Packages", body: "Ooty, Kodaikanal, Munnar and Valparai itineraries crafted around you." },
  { icon: Car, title: "Local Taxi", body: "Hourly rentals inside Udumalpet, Pollachi and Coimbatore city limits." },
  { icon: Briefcase, title: "Corporate Taxi", body: "Monthly billing, verified chauffeurs and priority allocation for teams." },
];

function SpotlightCard({ service }: { service: Service }) {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const Icon = service.icon;

  return (
    <motion.article
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card/70 p-7 backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(340px circle at ${pos.x}% ${pos.y}%, color-mix(in oklab, var(--gold) 22%, transparent), transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: "var(--shadow-glow)" }}
      />
      <div className="relative">
        <span className="grid size-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform duration-500 group-hover:rotate-12">
          <Icon className="size-5" />
        </span>
        <h3 className="mt-6 text-xl font-bold">{service.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{service.body}</p>
      </div>
    </motion.article>
  );
}

export function Services() {
  return (
    <section id="services" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.32em] text-primary">Our services</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-extrabold md:text-5xl">
            Every kind of journey, <span className="text-gradient-gold">one standard</span>
          </h2>
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <StaggerItem key={s.title} className="h-full">
              <SpotlightCard service={s} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
