"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, PhoneCall, ShieldCheck, Star } from "lucide-react";
import heroRoad from "@/assets/hero-road.jpg";
import { BookingForm } from "./booking-form";
import { Magnetic, Reveal, StaggerGroup, StaggerItem } from "./motion-primitives";
import { PHONE_PRIMARY } from "@/lib/site-data";

const headlines = [
  { line1: "Travel safe.", line2: "Reach happy." },
  { line1: "Book in minutes.", line2: "Ride in comfort." },
  { line1: "Hills or highways.", line2: "We take you there." },
] as const;

const subcopies = [
  "Chauffeur-driven sedans, MPVs and tempo travellers across Tamil Nadu and Kerala. Transparent fares, spotless cars, drivers who know every hill road by heart.",
  "Airport pickups at Coimbatore, one-way drops and round trips — confirmed on WhatsApp, day or night.",
  "Ooty, Kodaikanal, Valparai and Kerala tours in sanitised cars with drivers who know every ghats bend.",
] as const;

function TypedHeadline({
  index,
  onCycle,
}: {
  index: number;
  onCycle: () => void;
}) {
  const reduce = useReducedMotion();
  const current = headlines[index]!;
  const full = `${current.line1}\n${current.line2}`;
  const [shown, setShown] = useState(reduce ? full : "");

  useEffect(() => {
    if (reduce) {
      setShown(full);
      return;
    }
    setShown("");
    let i = 0;
    let timer = 0;
    const type = () => {
      i += 1;
      setShown(full.slice(0, i));
      if (i < full.length) {
        timer = window.setTimeout(type, 48);
      } else {
        timer = window.setTimeout(() => {
          const erase = () => {
            i -= 1;
            setShown(full.slice(0, Math.max(0, i)));
            if (i > 0) timer = window.setTimeout(erase, 28);
            else onCycle();
          };
          erase();
        }, 2200);
      }
    };
    timer = window.setTimeout(type, 280);
    return () => window.clearTimeout(timer);
  }, [full, onCycle, reduce]);

  const [first = "", second = ""] = shown.split("\n");

  return (
    <h1 className="mt-5 font-display text-[clamp(2.2rem,8vw,5rem)] font-bold leading-[1.02] text-foreground">
      <span className="sr-only">
        {current.line1} {current.line2}
      </span>
      <span aria-hidden className="grid">
        {headlines.map((h) => (
          <span key={h.line1} className="invisible col-start-1 row-start-1">
            {h.line1}
            <br />
            {h.line2}
          </span>
        ))}
        <span className="col-start-1 row-start-1">
          {first}
          {second !== undefined && shown.includes("\n") ? (
            <>
              <br />
              <span className="text-brand">{second}</span>
            </>
          ) : null}
          {!reduce && (
            <span className="ml-0.5 inline-block h-[0.82em] w-[0.08em] translate-y-[0.06em] animate-pulse bg-brand align-baseline" />
          )}
        </span>
      </span>
    </h1>
  );
}

function SlidingCopy({ index }: { index: number }) {
  const reduce = useReducedMotion();
  const text = subcopies[index] ?? subcopies[0];

  if (reduce) {
    return (
      <p className="mt-5 max-w-lg text-sm font-normal leading-relaxed text-body sm:text-base md:text-lg">
        {text}
      </p>
    );
  }

  return (
    <div className="relative mt-5 max-w-lg">
      <p className="invisible text-sm font-normal leading-relaxed sm:text-base md:text-lg" aria-hidden>
        {subcopies.reduce((a, b) => (a.length >= b.length ? a : b))}
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 text-sm font-normal leading-relaxed text-body sm:text-base md:text-lg"
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function Hero() {
  const [copyIndex, setCopyIndex] = useState(0);
  const onCycle = useCallback(() => {
    setCopyIndex((i) => (i + 1) % headlines.length);
  }, []);

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
        <StaggerGroup>
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-foreground sm:text-[11px] sm:tracking-[0.28em]">
              <ShieldCheck className="size-3.5 text-success" /> Udumalpet · Since 2015
            </span>
          </StaggerItem>

          <StaggerItem>
            <TypedHeadline index={copyIndex} onCycle={onCycle} />
          </StaggerItem>

          <StaggerItem>
            <SlidingCopy index={copyIndex} />
          </StaggerItem>

          <StaggerItem>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Magnetic>
                <a
                  href="#book"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground gold-ring sm:px-7 sm:py-3.5 sm:text-sm"
                >
                  Book your ride
                  <ArrowRight className="size-4" />
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] text-secondary-foreground sm:px-7 sm:py-3.5 sm:text-sm"
                >
                  <PhoneCall className="size-4 text-brand" /> Call now
                </a>
              </Magnetic>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-7 flex items-center gap-3 text-sm text-body">
              <span className="flex text-warning">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </span>
              4.9 average from 2,300+ riders
            </div>
          </StaggerItem>
        </StaggerGroup>

        <Reveal delay={0.12} className="w-full">
          <div id="book">
            <BookingForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
