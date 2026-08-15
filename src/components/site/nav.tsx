"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BrandLogo } from "@/components/site/brand-logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { cn } from "@/lib/utils";
import { PHONE_PRIMARY } from "@/lib/site-data";

const links = [
  { label: "Book your ride", href: "#book", id: "book" },
  { label: "Services", href: "#services", id: "services" },
  { label: "Routes", href: "#routes", id: "routes" },
  { label: "Fleet", href: "#fleet", id: "fleet" },
  { label: "Fare", href: "#fare", id: "fare" },
  { label: "Gallery", href: "#gallery", id: "gallery" },
  { label: "Contact", href: "#contact", id: "contact" },
  { label: "FAQ", href: "#faq", id: "faq" },
];

const spyLinks = links.filter((l) => l.id !== "book");

const HEADER_OFFSET = 88;

function navLinkClass(active: boolean) {
  return cn(
    "relative text-sm font-medium transition-colors",
    active
      ? "text-brand after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
      : "text-body hover:text-foreground",
  );
}

function sectionFromScroll(): string {
  const line = HEADER_OFFSET + 12;
  let current = "";
  for (const l of spyLinks) {
    const el = document.getElementById(l.id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= line) current = l.id;
  }
  const doc = document.documentElement;
  if (window.innerHeight + window.scrollY >= doc.scrollHeight - 48) {
    current = spyLinks[spyLinks.length - 1]?.id ?? current;
  }
  return current;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const clicking = useRef(false);
  const onHome = pathname === "/";
  const onStatus = pathname.startsWith("/status");

  useEffect(() => {
    if (!onHome) {
      setActiveHash("");
      setSolid(window.scrollY > 40);
      return;
    }

    const apply = () => {
      setSolid(window.scrollY > 40);
      if (clicking.current) return;
      const next = sectionFromScroll();
      if (next) setActiveHash(next);
    };

    apply();
    const hash = window.location.hash.replace("#", "");
    if (hash && links.some((l) => l.id === hash)) {
      setActiveHash(hash);
      requestAnimationFrame(() => scrollToId(hash));
    }

    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    window.addEventListener("hashchange", apply);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("hashchange", apply);
    };
  }, [onHome]);

  const goToSection = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    if (!onHome) return;
    event.preventDefault();
    clicking.current = true;
    setActiveHash(id);
    setOpen(false);
    scrollToId(id);
    history.replaceState(null, "", `#${id}`);
    window.setTimeout(() => {
      clicking.current = false;
    }, 700);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,box-shadow,padding] duration-200",
        solid
          ? "border-border bg-surface/95 py-2 shadow-sm backdrop-blur-md"
          : "border-transparent bg-surface/90 py-3 backdrop-blur-sm md:py-4",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <a href="/#top" className="flex items-center" aria-label="Yaazh Cabs home">
          <BrandLogo variant="nav" />
        </a>

        <ul className="hidden items-center gap-6 xl:gap-7 lg:flex">
          {links.map((l) => {
            const active = onHome && l.id !== "book" && activeHash === l.id;
            return (
              <li key={l.href}>
                <a
                  href={onHome ? l.href : `/${l.href}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => goToSection(l.id, event)}
                  className={
                    l.id === "book"
                      ? "rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                      : navLinkClass(active)
                  }
                >
                  {l.label}
                </a>
              </li>
            );
          })}
          <li>
            <Link
              to="/status"
              search={{ ref: "" }}
              aria-current={onStatus ? "page" : undefined}
              className={navLinkClass(onStatus)}
            >
              Track booking
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
            className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground gold-ring sm:inline-flex"
          >
            <Phone className="size-4" />
            {PHONE_PRIMARY}
          </a>
          <a
            href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
            aria-label="Call Yaazh Cabs"
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground sm:hidden"
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
        <ul className="mx-4 mt-3 rounded-xl border border-border bg-surface px-5 shadow-sm lg:hidden">
          {links.map((l) => {
            const active = onHome && activeHash === l.id;
            return (
              <li key={l.href} className="border-b border-border/60">
                <a
                  href={onHome ? l.href : `/${l.href}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => goToSection(l.id, event)}
                  className={cn(
                    "block py-3 text-sm font-medium",
                    l.id === "book"
                      ? "font-semibold text-brand"
                      : active
                        ? "text-brand"
                        : "text-body",
                  )}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
          <li>
            <Link
              to="/status"
              search={{ ref: "" }}
              onClick={() => setOpen(false)}
              aria-current={onStatus ? "page" : undefined}
              className={cn(
                "block py-3 text-sm font-semibold",
                onStatus ? "text-brand" : "text-secondary",
              )}
            >
              Track booking
            </Link>
          </li>
        </ul>
      )}
    </header>
  );
}
