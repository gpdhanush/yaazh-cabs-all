"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "motion/react";
import { ArrowRight, PhoneCall, ShieldCheck, Star } from "lucide-react";
import heroRoad from "@/assets/hero-road.jpg";
import { BookingForm } from "./booking-form";
import { Magnetic } from "./motion-primitives";
import { PHONE_PRIMARY } from "@/lib/site-data";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.28]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-24%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const rx = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 6);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      className="relative min-h-[100svh] overflow-hidden pb-24 pt-28 md:pt-32"
    >
      <motion.div className="absolute inset-0 -z-10" style={{ scale: bgScale, y: bgY }}>
        <img
          src={heroRoad}
          alt="Premium Yaazh Cabs sedan on a misty Western Ghats mountain road at sunrise"
          width={1920}
          height={1088}
          fetchPriority="high"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-background/55" />
        <div className="absolute inset-0 bg-[image:var(--gradient-night)]" />
      </motion.div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity, rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
        className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:px-8 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div>
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full glass-soft px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] text-primary"
          >
            <ShieldCheck className="size-3.5" /> Udumalpet · Since 2015
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(16px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-display text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold leading-[0.95]"
          >
            Travel safe.
            <br />
            <span className="text-gradient-gold">Reach happy.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Chauffeur-driven sedans, MPVs and tempo travellers across Tamil Nadu and Kerala.
            Transparent fares, spotless cars, drivers who know every hill road by heart.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } } }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <Magnetic>
                <a
                  href="#fare"
                  className="group inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-7 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground gold-ring"
                >
                  Estimate fare
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Magnetic>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <Magnetic>
                <a
                  href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border glass-soft px-7 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.14em] text-foreground"
                >
                  <PhoneCall className="size-4 text-primary" /> Call now
                </a>
              </Magnetic>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-9 flex items-center gap-3 text-sm text-muted-foreground"
          >
            <span className="flex text-primary">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </span>
            4.9 average from 2,300+ riders
          </motion.div>
        </div>

        <div className="animate-float">
          <BookingForm />
        </div>
      </motion.div>
    </section>
  );
}
