"use client";

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
  return (
    <section className="border-y border-border/70 bg-surface/40 py-10">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="mb-6 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:text-[11px] sm:tracking-[0.32em]">
          Trusted by teams &amp; travellers
        </p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 text-center sm:grid-cols-4">
          {partners.map((p) => (
            <li
              key={p}
              className="font-display text-sm font-semibold text-muted-foreground/80 md:text-lg"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
