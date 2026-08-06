"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import ooty from "@/assets/gallery-ooty.jpg";
import city from "@/assets/gallery-city.jpg";
import temple from "@/assets/gallery-temple.jpg";
import lake from "@/assets/gallery-lake.jpg";
import hero from "@/assets/hero-road.jpg";
import suv from "@/assets/car-suv.jpg";
import { Reveal } from "./motion-primitives";

const shots = [
  { src: ooty, alt: "Tea plantation road to Ooty at sunrise" },
  { src: hero, alt: "Yaazh Cabs sedan on a Western Ghats highway" },
  { src: temple, alt: "Palani temple gopuram at sunrise" },
  { src: lake, alt: "Kodaikanal lake in morning mist" },
  { src: city, alt: "Coimbatore skyline at blue hour" },
  { src: suv, alt: "Premium SUV from the Yaazh fleet" },
];

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="gallery" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.32em] text-primary">Gallery</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-extrabold md:text-5xl">
            Places we take you <span className="text-gradient-gold">every week</span>
          </h2>
        </Reveal>

        <div className="mt-14 columns-2 gap-4 lg:columns-3 [&>*]:mb-4">
          {shots.map((s, i) => (
            <motion.button
              key={s.alt}
              initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setOpen(i)}
              className="group block w-full overflow-hidden rounded-2xl border border-border"
            >
              <img
                src={s.src}
                alt={s.alt}
                loading="lazy"
                className="w-full object-cover transition-transform duration-[900ms] ease-[var(--ease-lux)] group-hover:scale-110"
              />
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[90] grid place-items-center bg-background/85 p-6 backdrop-blur-xl"
          >
            <button
              aria-label="Close image"
              className="absolute right-6 top-6 grid size-11 place-items-center rounded-full border border-border text-foreground"
            >
              <X className="size-5" />
            </button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0, filter: "blur(14px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              src={shots[open]!.src}
              alt={shots[open]!.alt}
              className="max-h-[80vh] w-auto rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
