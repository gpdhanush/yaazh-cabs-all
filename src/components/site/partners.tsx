"use client";

import { Reveal } from "./motion-primitives";

const partners = [
  "TCS Coimbatore",
  "Bosch",
  "Taj Hotels",
  "Sakthi Group",
  "PSG Institutions",
  "Amazon India",
  "KG Hospital",
  "Pricol",
];

export function Partners() {
  const row = [...partners, ...partners];
  return (
    <section className="border-y border-border/70 bg-surface/40 py-10">
      <Reveal className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="mb-6 text-center text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Trusted by teams &amp; travellers
        </p>
      </Reveal>
      <div className="group marquee-mask overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-14 group-hover:[animation-play-state:paused]">
          {row.map((p, i) => (
            <span
              key={`${p}-${i}`}
              className="whitespace-nowrap font-display text-lg font-semibold text-muted-foreground/70 transition-colors duration-300 hover:text-primary md:text-2xl"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
