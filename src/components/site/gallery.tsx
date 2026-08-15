"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import ooty from "@/assets/gallery-ooty.jpg";
import city from "@/assets/gallery-city.jpg";
import temple from "@/assets/gallery-temple.jpg";
import lake from "@/assets/gallery-lake.jpg";
import hero from "@/assets/hero-road.jpg";
import suv from "@/assets/car-suv.jpg";
import { cn } from "@/lib/utils";
import {
  getGallery,
  isApiConfigured,
  mediaUrl,
  type PublicGalleryGroup,
} from "@/lib/api";

const fallbackGroups: PublicGalleryGroup[] = [
  {
    id: "fallback-destinations",
    slug: "destinations",
    title: "Destinations",
    group_type: "destinations",
    images: [
      { id: "h", image_url: hero, caption: "Hill highways" },
      { id: "o", image_url: ooty, caption: "Ooty estates" },
      { id: "c", image_url: city, caption: "City nights" },
      { id: "l", image_url: lake, caption: "Kodaikanal" },
      { id: "t", image_url: temple, caption: "Temple towns" },
    ],
  },
  {
    id: "fallback-cars",
    slug: "cars-outside",
    title: "Cars — Outside",
    group_type: "cars_outside",
    images: [{ id: "s", image_url: suv, caption: "Fleet ready" }],
  },
];

export function Gallery() {
  const [groups, setGroups] = useState<PublicGalleryGroup[]>([]);
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) return;
    getGallery()
      .then((rows) => {
        if (rows?.length) setGroups(rows);
      })
      .catch(() => {
        /* fallback */
      });
  }, []);

  const display = groups.length ? groups : fallbackGroups;
  const current = display[Math.min(tab, display.length - 1)] ?? display[0];
  const images = useMemo(
    () =>
      (current?.images ?? []).map((img) => ({
        ...img,
        src: mediaUrl(img.image_url) || img.image_url,
      })),
    [current],
  );
  const activeImage = active !== null ? images[active] : null;

  useEffect(() => {
    setActive(null);
  }, [tab]);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <section id="gallery" className="relative overflow-hidden py-16 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">
              Gallery
            </p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              Cars inside, outside &amp; the <span className="text-brand">roads we drive</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:text-right">
            Browse by group. Tap a photo to view it full size.
          </p>
        </div>

        {display.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {display.map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setTab(i)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors sm:text-sm sm:tracking-[0.12em]",
                  i === tab
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-brand/50 hover:text-foreground",
                )}
              >
                {g.title}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[220px] md:grid-cols-3 md:gap-4 lg:auto-rows-[240px] lg:grid-cols-4">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-[linear-gradient(180deg,#f4f6fb,#ffffff)] text-left outline-none transition-[border-color,box-shadow] hover:border-brand/50 hover:shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)] focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={img.src}
                alt={img.caption || current?.title || "Gallery photo"}
                loading="lazy"
                className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F2933]/85 via-[#1F2933]/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-95" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-5">
                <span className="font-display text-sm font-semibold tracking-wide text-white md:text-base">
                  {img.caption || current?.title}
                </span>
                <span className="translate-y-1 text-[10px] uppercase tracking-[0.2em] text-white/0 transition-all duration-300 group-hover:translate-y-0 group-hover:text-primary">
                  View
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeImage.caption || "Gallery preview"}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1F2933]/80 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="Close gallery preview"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setActive(null)}
          >
            <X className="size-5" />
          </button>
          <figure
            className="relative max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.src}
              alt={activeImage.caption || "Gallery photo"}
              className="max-h-[85vh] w-full object-contain"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 py-4 text-sm text-white">
              {activeImage.caption || current?.title}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
