"use client";

import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { getTestimonials, isApiConfigured, type PublicTestimonial } from "@/lib/api";

const FALLBACK = [
  {
    id: "f1",
    name: "Karthik R.",
    place: "Coimbatore",
    text: "Booked an Innova for a Kodaikanal trip. Driver was on time, car spotless, and the fare was exactly what was quoted.",
    rating: 5,
  },
  {
    id: "f2",
    name: "Divya S.",
    place: "Udumalpet",
    text: "3 AM airport drop and they confirmed on WhatsApp within minutes. This is my go-to cab service now.",
    rating: 5,
  },
  {
    id: "f3",
    name: "Mohan Kumar",
    place: "Pollachi",
    text: "We use Yaazh for all our company guest pickups. Billing is clean and drivers are courteous.",
    rating: 5,
  },
  {
    id: "f4",
    name: "Anitha P.",
    place: "Tiruppur",
    text: "Valparai tour package was well planned. The driver knew every viewpoint worth stopping at.",
    rating: 5,
  },
  {
    id: "f5",
    name: "Suresh V.",
    place: "Palani",
    text: "Fair pricing for one-way. No hidden return charges like other operators.",
    rating: 5,
  },
  {
    id: "f6",
    name: "Lakshmi N.",
    place: "Madurai",
    text: "Travelled with my elderly parents. The driver was patient and helped with luggage throughout.",
    rating: 5,
  },
];

type Card = { id: string; name: string; place: string; text: string; rating: number };

function mapApi(rows: PublicTestimonial[]): Card[] {
  return rows.map((t) => ({
    id: t.id,
    name: t.customer_name,
    place: t.is_featured ? "Featured rider" : "Yaazh Cabs rider",
    text: t.review,
    rating: t.rating || 5,
  }));
}

export function Testimonials() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [testimonials, setTestimonials] = useState<Card[]>(FALLBACK);

  useEffect(() => {
    if (!isApiConfigured()) return;
    getTestimonials()
      .then((rows) => {
        if (rows.length) setTestimonials(mapApi(rows));
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand sm:text-[11px]">
              Reviews
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              What our <span className="text-brand">riders say</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {current + 1} / {testimonials.length}
          </p>
        </div>

        <div className="relative mt-10">
          <Carousel
            setApi={setApi}
            opts={{ loop: true, align: "start" }}
            plugins={[
              Autoplay({
                delay: 4200,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((t) => (
                <CarouselItem key={t.id} className="md:basis-1/2 lg:basis-1/3">
                  <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex gap-1 text-brand">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn("size-3.5", i < t.rating ? "fill-current" : "opacity-30")}
                        />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-body">
                      “{t.text}”
                    </blockquote>
                    <figcaption className="mt-5 border-t border-border pt-4 text-sm">
                      <span className="font-semibold text-foreground">{t.name}</span>
                      <span className="text-muted-foreground"> · {t.place}</span>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 border-border bg-card text-foreground shadow-sm md:-left-4" />
            <CarouselNext className="right-0 border-border bg-card text-foreground shadow-sm md:-right-4" />
          </Carousel>

          <div className="mt-6 flex justify-center gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.id}
                type="button"
                aria-label={`Go to review ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
