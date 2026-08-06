"use client";

import { Quote } from "lucide-react";
import { Reveal } from "./motion-primitives";

type T = { name: string; place: string; text: string };

const all: T[] = [
  { name: "Ramesh K.", place: "Udumalpet", text: "Booked at 4 AM for an airport drop. Driver reached 15 minutes early, car spotless. This is how it should be done." },
  { name: "Divya S.", place: "Coimbatore", text: "Did the Kodaikanal package with my parents. Our driver knew every viewpoint and drove so patiently on the ghats." },
  { name: "Arun P.", place: "Pollachi", text: "Fare quoted was the fare paid. No last-minute toll drama. That alone made me a regular." },
  { name: "Meena R.", place: "Palani", text: "Ertiga was roomy and clean, AC perfect. Travelled with a toddler and it was completely stress free." },
  { name: "Sathish V.", place: "Tiruppur", text: "We use Yaazh for all our company guest pickups now. Billing is simple and drivers are always presentable." },
  { name: "Fathima N.", place: "Ooty", text: "Late night drop from Coimbatore and I felt completely safe. The live updates to my family were a nice touch." },
];

function Column({ items, duration, reverse }: { items: T[]; duration: number; reverse?: boolean }) {
  const list = [...items, ...items];
  return (
    <div className="group relative h-[520px] overflow-hidden marquee-mask [mask-image:linear-gradient(180deg,transparent,black_12%,black_88%,transparent)]">
      <div
        className="flex flex-col gap-5 group-hover:[animation-play-state:paused]"
        style={{
          animation: `${reverse ? "marquee-down" : "marquee-up"} ${duration}s linear infinite`,
        }}
      >
        {list.map((t, i) => (
          <figure key={`${t.name}-${i}`} className="glass-soft rounded-2xl p-6">
            <Quote className="size-5 text-primary" />
            <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t.text}
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-[image:var(--gradient-gold)] font-display text-sm font-bold text-primary-foreground">
                {t.name.charAt(0)}
              </span>
              <span>
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.place}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-24 md:py-32">
      <style>{`
        @keyframes marquee-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes marquee-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
      `}</style>
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-primary">Riders talk</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-extrabold md:text-5xl">
            Ten thousand journeys, <span className="text-gradient-gold">one promise kept</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Column items={all.slice(0, 3)} duration={34} />
          <Column items={all.slice(3, 6)} duration={40} reverse />
          <div className="hidden lg:block">
            <Column items={[...all.slice(1, 3), ...all.slice(4)]} duration={46} />
          </div>
        </div>
      </div>
    </section>
  );
}
