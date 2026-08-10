"use client";

import ooty from "@/assets/gallery-ooty.jpg";
import city from "@/assets/gallery-city.jpg";
import temple from "@/assets/gallery-temple.jpg";
import lake from "@/assets/gallery-lake.jpg";
import hero from "@/assets/hero-road.jpg";
import suv from "@/assets/car-suv.jpg";

const images = [
  { src: ooty, alt: "Tea estate road on the Ooty taxi route" },
  { src: city, alt: "Coimbatore city drive at dusk" },
  { src: temple, alt: "South Indian temple visited on tour packages" },
  { src: lake, alt: "Kodaikanal lake view on a Yaazh Cabs trip" },
  { src: hero, alt: "Yaazh Cabs sedan on a hill highway" },
  { src: suv, alt: "SUV from the Yaazh Cabs fleet" },
];

export function Gallery() {
  return (
    <section id="gallery" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary sm:text-[11px]">Gallery</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
          Places we <span className="text-gradient-gold">take you</span>
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((img) => (
            <div key={img.alt} className="overflow-hidden rounded-xl border border-border">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="aspect-[4/3] size-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
