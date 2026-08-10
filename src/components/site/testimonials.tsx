"use client";

import { Star } from "lucide-react";

const testimonials = [
  { name: "Karthik R.", place: "Coimbatore", text: "Booked an Innova for a Kodaikanal trip. Driver was on time, car spotless, and the fare was exactly what was quoted." },
  { name: "Divya S.", place: "Udumalpet", text: "3 AM airport drop and they confirmed on WhatsApp within minutes. This is my go-to cab service now." },
  { name: "Mohan Kumar", place: "Pollachi", text: "We use Yaazh for all our company guest pickups. Billing is clean and drivers are courteous." },
  { name: "Anitha P.", place: "Tiruppur", text: "Valparai tour package was well planned. The driver knew every viewpoint worth stopping at." },
  { name: "Suresh V.", place: "Palani", text: "Fair pricing for one-way. No hidden return charges like other operators." },
  { name: "Lakshmi N.", place: "Madurai", text: "Travelled with my elderly parents. The driver was patient and helped with luggage throughout." },
];

export function Testimonials() {
  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary sm:text-[11px]">Reviews</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
          What our <span className="text-gradient-gold">riders say</span>
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-border bg-card/70 p-6">
              <div className="flex gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4 text-sm">
                <span className="font-semibold">{t.name}</span>
                <span className="text-muted-foreground"> · {t.place}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
