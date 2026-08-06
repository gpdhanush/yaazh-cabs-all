"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CarFront, CheckCircle2, MapPinned, Smile, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion-primitives";

const steps = [
  { icon: MapPinned, title: "Select route", body: "Tell us pickup, drop, date and time." },
  { icon: CarFront, title: "Choose vehicle", body: "Sedan to tempo traveller — pick your comfort." },
  { icon: CheckCircle2, title: "Confirm booking", body: "Review the transparent fare and confirm." },
  { icon: Ticket, title: "Get confirmation", body: "Driver and cab details on WhatsApp instantly." },
  { icon: Smile, title: "Enjoy the ride", body: "Track, travel and reach happy. Every time." },
];

export function BookingProcess() {
  const [active, setActive] = useState(0);
  const R = 150;

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-primary">How it works</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-extrabold md:text-5xl">
            Five taps from here to <span className="text-gradient-gold">there</span>
          </h2>
        </Reveal>

        {/* Orbital view (desktop) */}
        <div className="relative mx-auto mt-16 hidden h-[420px] w-[420px] md:block">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-border"
          />
          <div className="absolute inset-10 rounded-full border border-border/60" />
          <div className="absolute left-1/2 top-1/2 w-52 -translate-x-1/2 -translate-y-1/2 text-center">
            <motion.p
              key={active}
              initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.45 }}
            >
              <span className="block font-display text-4xl font-extrabold text-gradient-gold">
                0{active + 1}
              </span>
              <span className="mt-2 block font-display text-lg font-bold">{steps[active]!.title}</span>
              <span className="mt-2 block text-xs text-muted-foreground">{steps[active]!.body}</span>
            </motion.p>
          </div>

          {steps.map((s, i) => {
            const angle = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
            const Icon = s.icon;
            const isActive = i === active;
            return (
              <button
                key={s.title}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={s.title}
                className={cn(
                  "absolute grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border transition-all duration-500",
                  isActive
                    ? "scale-125 border-primary bg-primary/20 text-primary [box-shadow:var(--shadow-glow)]"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50",
                )}
                style={{
                  left: `calc(50% + ${Math.cos(angle) * R}px)`,
                  top: `calc(50% + ${Math.sin(angle) * R}px)`,
                }}
              >
                <Icon className="size-6" />
              </button>
            );
          })}
        </div>

        {/* Vertical list (mobile) */}
        <ol className="mt-12 space-y-4 md:hidden">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-4 rounded-2xl border border-border bg-card/70 p-5"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-display font-bold">
                    <span className="text-primary">0{i + 1}</span> · {s.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
