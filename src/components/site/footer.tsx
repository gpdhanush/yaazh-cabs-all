"use client";

import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Magnetic, Reveal, StaggerGroup, StaggerItem } from "./motion-primitives";
import { PHONE_PRIMARY, PHONE_SECONDARY } from "@/lib/site-data";

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
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface/50 pt-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
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
              {[Facebook, Instagram, MessageCircle].map((Icon, i) => (
                <Magnetic key={i} strength={0.45}>
                  <a
                    href="#top"
                    aria-label="Yaazh Cabs social profile"
                    className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-300 hover:rotate-12 hover:border-primary hover:text-primary"
                  >
                    <Icon className="size-4" />
                  </a>
                </Magnetic>
              ))}
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-primary">
                {c.title}
              </h3>
              <StaggerGroup className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <StaggerItem key={l}>
                    <a
                      href="#top"
                      className="relative inline-block text-sm text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100"
                    >
                      {l}
                    </a>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          ))}

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Reach us
            </h3>
            <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 text-primary" />
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
                <MapPin className="mt-0.5 size-4 text-primary" />
                Udumalpet, Tiruppur District, Tamil Nadu
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-primary" />
                hello@yaazhcabs.in
              </li>
            </ul>
          </div>
        </Reveal>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border py-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Yaazh Cabs. Travel safe, reach happy.</p>
          <p className="uppercase tracking-[0.24em]">Safe journey, every time</p>
        </div>
      </div>

      <p
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[18vw] font-extrabold leading-[0.75] text-foreground/[0.035]"
      >
        YAAZH CABS
      </p>
    </footer>
  );
}
