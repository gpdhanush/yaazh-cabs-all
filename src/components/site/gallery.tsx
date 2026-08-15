"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import ooty from "@/assets/gallery-ooty.jpg";
import city from "@/assets/gallery-city.jpg";
import temple from "@/assets/gallery-temple.jpg";
import lake from "@/assets/gallery-lake.jpg";
import hero from "@/assets/hero-road.jpg";
import suv from "@/assets/car-suv.jpg";
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
    title: "Maruti Suzuki Dzire",
    group_type: "cars_outside",
    images: [{ id: "s", image_url: suv, caption: "Fleet ready" }],
  },
];

type AlbumImage = {
  id: string;
  src: string;
  caption: string | null;
};

export function Gallery() {
  const [groups, setGroups] = useState<PublicGalleryGroup[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

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
  const albums = useMemo(
    () =>
      display.map((g) => ({
        ...g,
        photos: g.images.map((img) => ({
          id: img.id,
          src: mediaUrl(img.image_url) || img.image_url,
          caption: img.caption,
        })),
      })),
    [display],
  );

  const album = albums.find((g) => g.id === openId) ?? null;
  const photos: AlbumImage[] = album?.photos ?? [];
  const current = photos[photoIndex] ?? photos[0] ?? null;

  useEffect(() => {
    if (!album) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      if (e.key === "ArrowRight") setPhotoIndex((i) => (i + 1) % Math.max(photos.length, 1));
      if (e.key === "ArrowLeft") {
        setPhotoIndex((i) => (i - 1 + photos.length) % Math.max(photos.length, 1));
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [album, photos.length]);

  function openAlbum(id: string) {
    setOpenId(id);
    setPhotoIndex(0);
  }

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
          {/* <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:text-right">
            Tap a group to see every photo — outside, inside, and more.
          </p> */}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((g) => {
            const cover = g.photos[0];
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => openAlbum(g.id)}
                className="group overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-[0_18px_50px_-28px_rgba(17,24,39,0.4)] outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-[16/10] bg-[linear-gradient(180deg,#f4f6fb,#ffffff)]">
                  {cover && (
                    <img
                      src={cover.src}
                      alt={g.title}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1F2933]/90 via-[#1F2933]/20 to-transparent" />
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#111827]">
                    <Images className="size-3" /> {g.photos.length} photo{g.photos.length === 1 ? "" : "s"}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-lg font-bold text-white sm:text-xl">{g.title}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-primary">View album</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {album && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={album.title}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1F2933]/85 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setOpenId(null)}
        >
          <button
            type="button"
            aria-label="Close album"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setOpenId(null)}
          >
            <X className="size-5" />
          </button>

          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b1220] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <p className="font-display text-base font-bold text-white sm:text-lg">{album.title}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">
                  {photoIndex + 1} / {photos.length}
                  {current.caption ? ` · ${current.caption}` : ""}
                </p>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
              <img
                src={current.src}
                alt={current.caption || album.title}
                className="max-h-[62vh] w-full object-contain"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    className="absolute left-2 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:left-3"
                    onClick={() =>
                      setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                    }
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    className="absolute right-2 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:right-3"
                    onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-3">
                {photos.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                      i === photoIndex ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.src} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
