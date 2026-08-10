"use client";

import { ArrowUp, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ADMIN_EMAIL, ADMIN_WHATSAPP, PHONE_PRIMARY, PHONE_SECONDARY } from "@/lib/site-data";

const columns = [
  {
    title: "Services",
    links: ["Airport Taxi", "One Way Taxi", "Round Trip", "Tour Packages", "Local Taxi"],
  },
  {
    title: "Routes",
    links: [
      "Udumalpet → Pollachi",
      "Udumalpet → Coimbatore",
      "Udumalpet → Palani",
      "Pollachi → Coimbatore",
    ],
  },
];

export function SiteFooter() {
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface/50 pt-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-[image:var(--gradient-gold)] font-display text-lg font-extrabold text-primary-foreground">
                Y
              </span>
              <span className="font-display text-xl font-extrabold">
                YAAZH <span className="text-gradient-gold">CABS</span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Udumalpet's trusted travel partner since 2015. Comfortable rides, reliable service,
              best prices — every single time.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP}`}
                target="_blank"
                rel="noopener"
                aria-label="Chat with Yaazh Cabs on WhatsApp"
                className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <MessageCircle className="size-4" />
              </a>
              {[Facebook, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#top"
                  aria-label="Yaazh Cabs social profile"
                  className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-primary">
                {c.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#top" className="text-sm text-muted-foreground hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Reach us
            </h3>
            <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <a href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`} className="block hover:text-foreground">
                    {PHONE_PRIMARY}
                  </a>
                  <a href={`tel:+91${PHONE_SECONDARY.replace(/\s/g, "")}`} className="block hover:text-foreground">
                    {PHONE_SECONDARY}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                Udumalpet, Tiruppur District, Tamil Nadu
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`mailto:${ADMIN_EMAIL}`} className="hover:text-foreground">
                  {ADMIN_EMAIL}
                </a>
              </li>
              <li>
                <Link to="/status" search={{ ref: "" }} className="text-primary hover:underline">
                  Track your booking →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Yaazh Cabs. Travel safe, reach happy.</p>
          <button
            type="button"
            onClick={toTop}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 uppercase tracking-[0.18em] hover:border-primary hover:text-primary"
          >
            <ArrowUp className="size-3.5" /> Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
