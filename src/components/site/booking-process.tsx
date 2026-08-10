"use client";

const steps = [
  { n: "01", title: "Share your trip", body: "Fill the booking form with pickup, drop, date, time and vehicle." },
  { n: "02", title: "Instant confirmation", body: "Details reach our desk on WhatsApp and we call back to confirm." },
  { n: "03", title: "Driver assigned", body: "You get the driver name, car number and phone before pickup." },
  { n: "04", title: "Travel & pay", body: "Reach safely. Pay by cash, UPI or bank transfer after the ride." },
];

export function BookingProcess() {
  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary sm:text-[11px]">How it works</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
          Booked in <span className="text-gradient-gold">four simple steps</span>
        </h2>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-border bg-card/70 p-6">
              <span className="font-display text-3xl font-extrabold text-primary/40">{s.n}</span>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
