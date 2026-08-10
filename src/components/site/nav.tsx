"use client";

import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PHONE_PRIMARY } from "@/lib/site-data";

const links = [
  { label: "Services", href: "#services" },
  { label: "Routes", href: "#routes" },
  { label: "Fleet", href: "#fleet" },
  { label: "Fare", href: "#fare" },
  { label: "Gallery", href: "#gallery" },
  { label: "FAQ", href: "#faq" },
];

export function SiteNav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50", solid ? "glass py-2" : "bg-transparent py-3 md:py-4")}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-gold)] font-display text-base font-extrabold text-primary-foreground md:size-10 md:text-lg">
            Y
          </span>
          <span className="leading-none">
            <span className="block font-display text-base font-extrabold tracking-tight md:text-lg">
              YAAZH <span className="text-gradient-gold">CABS</span>
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
              Safe journey, every time
            </span>
          </span>
        </a>

        <ul className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link to="/status" search={{ ref: "" }} className="text-sm text-muted-foreground hover:text-foreground">
              Track booking
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-2">
          <a
            href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
            className="hidden items-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-4 py-2.5 text-sm font-semibold text-primary-foreground gold-ring sm:inline-flex"
          >
            <Phone className="size-4" />
            {PHONE_PRIMARY}
          </a>
          <a
            href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
            aria-label="Call Yaazh Cabs"
            className="grid size-10 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-primary-foreground sm:hidden"
          >
            <Phone className="size-4" />
          </a>
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-border text-foreground lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <ul className="mx-4 mt-3 rounded-xl glass px-5 lg:hidden">
          {links.map((l) => (
            <li key={l.href} className="border-b border-border/60">
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-sm text-muted-foreground"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              to="/status"
              search={{ ref: "" }}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm text-primary"
            >
              Track booking
            </Link>
          </li>
        </ul>
      )}
    </header>
  );
}
