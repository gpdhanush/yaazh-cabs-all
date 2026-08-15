"use client";

import { CountUp, Reveal } from "./motion-primitives";

const stats = [
  { to: 10, suffix: "+", label: "Years on the road" },
  { to: 42, suffix: "k+", label: "Rides completed" },
  { to: 4.9, suffix: "", label: "Average rating" },
  { text: "24×7", label: "Support desk" },
] as const;

export function Stats() {
  return (
    <section className="border-y border-border bg-surface/40 py-14 md:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 md:px-8 lg:grid-cols-4">
        {stats.map((s) => (
          <Reveal key={s.label} className="text-center">
            <p className="font-data text-3xl font-semibold text-brand sm:text-4xl md:text-5xl">
              {"text" in s ? s.text : <CountUp to={s.to} suffix={s.suffix} />}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
