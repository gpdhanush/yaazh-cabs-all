"use client";

import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  ADMIN_EMAIL,
  ADMIN_WHATSAPP,
  BUSINESS_ADDRESS,
  BUSINESS_HOURS,
  MAP_EMBED_URL,
  MAPS_SHARE_URL,
  PHONE_PRIMARY,
  PHONE_SECONDARY,
} from "@/lib/site-data";

const contactRows = [
  {
    icon: Phone,
    label: "Call us",
    body: (
      <span className="flex flex-col gap-1">
        <a href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`} className="hover:text-brand">
          {PHONE_PRIMARY}
        </a>
        <a href={`tel:+91${PHONE_SECONDARY.replace(/\s/g, "")}`} className="hover:text-brand">
          {PHONE_SECONDARY}
        </a>
      </span>
    ),
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    body: (
      <a
        href={`https://wa.me/${ADMIN_WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-brand"
      >
        Chat with us
      </a>
    ),
  },
  {
    icon: Mail,
    label: "Email",
    body: (
      <a href={`mailto:${ADMIN_EMAIL}`} className="hover:text-brand">
        {ADMIN_EMAIL}
      </a>
    ),
  },
  {
    icon: MapPin,
    label: "Location",
    body: BUSINESS_ADDRESS,
  },
  {
    icon: Clock,
    label: "Hours",
    body: BUSINESS_HOURS,
  },
];

export function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden py-16 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">Contact</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          Reach us in <span className="text-brand">Udumalpet</span>
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Bookings, airport transfers and tour queries — call, WhatsApp or drop by. We confirm
          drivers quickly, day or night.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-14">
          <ul className="space-y-6">
            {contactRows.map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.label} className="flex gap-4">
                  <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl border border-primary/35 bg-primary/12 text-brand">
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {row.label}
                    </p>
                    <div className="mt-1.5 text-sm font-medium text-foreground md:text-base">
                      {row.body}
                    </div>
                  </div>
                </li>
              );
            })}

            <li className="pt-2">
              <a
                href={MAPS_SHARE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground gold-ring"
              >
                Open in Google Maps
                <ExternalLink className="size-3.5" />
              </a>
            </li>
          </ul>

          <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:min-h-[360px] lg:min-h-full">
            <iframe
              title="Yaazh Cabs location on Google Maps"
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="absolute inset-0 size-full border-0 grayscale-[0.15] contrast-[1.05]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
