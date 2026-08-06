"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Magnetic } from "./motion-primitives";
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
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid ? "glass py-2 shadow-none" : "bg-transparent py-4",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 md:px-8">
        <a href="#top" className="group flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[image:var(--gradient-gold)] font-display text-lg font-extrabold text-primary-foreground">
            Y
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-extrabold tracking-tight">
              YAAZH <span className="text-gradient-gold">CABS</span>
            </span>
            <span className="block text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Safe journey, every time
            </span>
          </span>
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative text-sm text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Magnetic className="hidden sm:inline-block">
            <a
              href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-5 py-2.5 text-sm font-semibold text-primary-foreground gold-ring"
            >
              <Phone className="size-4" />
              {PHONE_PRIMARY}
            </a>
          </Magnetic>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-border text-foreground lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-5 mt-3 overflow-hidden rounded-xl glass px-5 lg:hidden"
          >
            {links.map((l) => (
              <li key={l.href} className="border-b border-border/60 last:border-none">
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm text-muted-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
