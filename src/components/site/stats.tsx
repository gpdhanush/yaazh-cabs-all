"use client";

import { motion } from "motion/react";
import { Clock4, Heart, Route, UserCheck } from "lucide-react";
import { CountUp, StaggerGroup, StaggerItem } from "./motion-primitives";

const stats = [
  { icon: Heart, value: 10000, suffix: "+", label: "Happy customers" },
  { icon: Route, value: 500, suffix: "+", label: "Daily trips" },
  { icon: UserCheck, value: 25, suffix: "+", label: "Professional drivers" },
  { icon: Clock4, value: 0, suffix: "", label: "Support", literal: "24×7" },
];

export function Stats() {
  return (
    <section className="relative border-y border-border/70 bg-surface/40 py-20">
      <StaggerGroup className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <StaggerItem key={s.label}>
              <div className="group text-center">
                <motion.span
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className="mx-auto grid size-14 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-shadow duration-500 group-hover:[box-shadow:var(--shadow-glow)]"
                >
                  <Icon className="size-6" />
                </motion.span>
                <p className="mt-5 font-display text-4xl font-extrabold text-gradient-gold tabular-nums md:text-5xl">
                  {s.literal ?? <CountUp to={s.value} suffix={s.suffix} />}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {s.label}
                </p>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
