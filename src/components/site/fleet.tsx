"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Briefcase, Users } from "lucide-react";
import { vehicles } from "@/lib/site-data";
import { Reveal, StaggerGroup, StaggerItem } from "./motion-primitives";

function TiltCard({ v }: { v: (typeof vehicles)[number] }) {
  const [t, setT] = useState({ rx: 0, ry: 0 });
  return (
    <motion.article
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setT({
          ry: ((e.clientX - r.left) / r.width - 0.5) * 12,
          rx: -((e.clientY - r.top) / r.height - 0.5) * 10,
        });
      }}
      onPointerLeave={() => setT({ rx: 0, ry: 0 })}
      animate={{ rotateX: t.rx, rotateY: t.ry }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      style={{ transformPerspective: 900 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card/70 p-6 transition-shadow duration-500 hover:[box-shadow:var(--shadow-glow)]"
    >
      <div className="relative h-40 overflow-hidden rounded-xl bg-surface-2/50">
        <img
          src={v.image}
          alt={`${v.name} taxi available for booking`}
          loading="lazy"
          width={1024}
          height={640}
          className="size-full object-contain p-2 transition-transform duration-700 ease-[var(--ease-lux)] group-hover:scale-110 motion-safe:animate-float"
        />
      </div>
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">{v.name}</h3>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{v.tag}</p>
        </div>
        <p className="whitespace-nowrap font-display text-lg font-extrabold text-gradient-gold">
          ₹{v.perKm}/km
        </p>
      </div>
      <div className="mt-5 flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5 text-primary" /> {v.seats} seats
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Briefcase className="size-3.5 text-primary" /> {v.bags} bags
        </span>
      </div>
    </motion.article>
  );
}

export function Fleet() {
  return (
    <section id="fleet" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.32em] text-primary">The fleet</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-extrabold md:text-5xl">
            Sanitised, serviced, <span className="text-gradient-gold">showroom clean</span>
          </h2>
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <StaggerItem key={v.id} className="h-full">
              <TiltCard v={v} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
