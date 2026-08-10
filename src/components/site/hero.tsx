"use client";

import { ArrowRight, PhoneCall, ShieldCheck, Star } from "lucide-react";
import heroRoad from "@/assets/hero-road.jpg";
import { BookingForm } from "./booking-form";
import { PHONE_PRIMARY } from "@/lib/site-data";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroRoad}
          alt="Yaazh Cabs sedan on a Western Ghats mountain road at sunrise"
          width={1920}
          height={1088}
          fetchPriority="high"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-background/80 dark:bg-background/70" />
        <div className="absolute inset-0 bg-[image:var(--gradient-night)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-secondary sm:text-[11px] sm:tracking-[0.28em]">
            <ShieldCheck className="size-3.5 text-success" /> Udumalpet · Since 2015
          </span>

          <h1 className="mt-5 font-display text-[clamp(2.2rem,8vw,5rem)] font-bold leading-[1.02] text-foreground">
            Travel safe.
            <br />
            <span className="text-brand">Reach happy.</span>
          </h1>

          <p className="mt-5 max-w-lg text-sm font-normal leading-relaxed text-body sm:text-base md:text-lg">
            Chauffeur-driven sedans, MPVs and tempo travellers across Tamil Nadu and Kerala.
            Transparent fares, spotless cars, drivers who know every hill road by heart.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#fare"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground gold-ring sm:px-7 sm:py-3.5 sm:text-sm"
            >
              Estimate fare
              <ArrowRight className="size-4" />
            </a>
            <a
              href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] text-secondary-foreground sm:px-7 sm:py-3.5 sm:text-sm"
            >
              <PhoneCall className="size-4 text-brand" /> Call now
            </a>
          </div>

          <div className="mt-7 flex items-center gap-3 text-sm text-body">
            <span className="flex text-warning">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </span>
            4.9 average from 2,300+ riders
          </div>
        </div>

        <div id="book">
          <BookingForm />
        </div>
      </div>
    </section>
  );
}
