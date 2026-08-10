"use client";

const stats = [
  { value: "10+", label: "Years on the road" },
  { value: "42k+", label: "Rides completed" },
  { value: "4.9", label: "Average rating" },
  { value: "24×7", label: "Support desk" },
];

export function Stats() {
  return (
    <section className="border-y border-border bg-surface/40 py-14 md:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 md:px-8 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-data text-3xl font-semibold text-brand sm:text-4xl md:text-5xl">
              {s.value}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
