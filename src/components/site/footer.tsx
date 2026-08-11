"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUp, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/site/brand-logo";
import {
  ADMIN_EMAIL,
  ADMIN_WHATSAPP,
  BUSINESS_ADDRESS,
  MAPS_SHARE_URL,
  PHONE_PRIMARY,
  PHONE_SECONDARY,
  popularOneWayRoutes,
} from "@/lib/site-data";
import { getAppConfig, getRoutes, isApiConfigured } from "@/lib/api";

function digits(v: string) {
  return v.replace(/\D/g, "");
}

function formatPhone(raw: string) {
  const d = digits(raw).slice(-10);
  if (d.length !== 10) return raw;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

export function SiteFooter() {
  const [routeLinks, setRouteLinks] = useState(
    popularOneWayRoutes.slice(0, 4).map((r) => `${r.from} → ${r.to}`),
  );
  const [phonePrimary, setPhonePrimary] = useState(PHONE_PRIMARY);
  const [phoneSecondary, setPhoneSecondary] = useState(PHONE_SECONDARY);
  const [whatsapp, setWhatsapp] = useState(ADMIN_WHATSAPP);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [address, setAddress] = useState(BUSINESS_ADDRESS);
  const [mapsShare, setMapsShare] = useState(MAPS_SHARE_URL);

  useEffect(() => {
    if (!isApiConfigured()) return;
    Promise.all([getRoutes({ popular: true, perPage: 8 }), getAppConfig().catch(() => null)])
      .then(([routes, cfg]) => {
        const links = routes
          .filter((r) => r.from && r.to)
          .slice(0, 4)
          .map((r) => `${r.from} → ${r.to}`);
        if (links.length) setRouteLinks(links);
        const s = cfg?.settings ?? {};
        if (s["support_phone"]) setPhonePrimary(formatPhone(s["support_phone"]));
        if (s["support_phone_secondary"]) setPhoneSecondary(formatPhone(s["support_phone_secondary"]));
        if (s["whatsapp_number"]) setWhatsapp(digits(s["whatsapp_number"]));
        if (s["support_email"]) setEmail(s["support_email"]);
        if (s["business_address"]) setAddress(s["business_address"]);
        if (s["maps_share_url"]) setMapsShare(s["maps_share_url"]);
      })
      .catch(() => {
        /* keep fallbacks */
      });
  }, []);

  const columns = useMemo(
    () => [
      {
        title: "Services",
        links: ["Airport Taxi", "One Way Taxi", "Round Trip", "Tour Packages", "Local Taxi"],
      },
      {
        title: "Routes",
        links: routeLinks,
      },
    ],
    [routeLinks],
  );

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative overflow-hidden bg-[#1F2933] pt-16 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
          <div>
            <BrandLogo variant="footer" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/65">
              Udumalpet&apos;s trusted travel partner since 2015. Comfortable rides, reliable service,
              best prices — every single time.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={`https://wa.me/${digits(whatsapp)}`}
                target="_blank"
                rel="noopener"
                aria-label="Chat with Yaazh Cabs on WhatsApp"
                className="grid size-10 place-items-center rounded-full border border-white/15 text-white/70 hover:border-primary hover:text-primary"
              >
                <MessageCircle className="size-4" />
              </a>
              {[Facebook, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#top"
                  aria-label="Yaazh Cabs social profile"
                  className="grid size-10 place-items-center rounded-full border border-white/15 text-white/70 hover:border-primary hover:text-primary"
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
                    <a href={c.title === "Routes" ? "#routes" : "#top"} className="text-sm text-white/65 hover:text-white">
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
            <ul className="mt-5 space-y-4 text-sm text-white/65">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <a href={`tel:+91${digits(phonePrimary).slice(-10)}`} className="block hover:text-white">
                    {phonePrimary}
                  </a>
                  <a
                    href={`tel:+91${digits(phoneSecondary).slice(-10)}`}
                    className="block hover:text-white"
                  >
                    {phoneSecondary}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <a
                  href={mapsShare}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  {address}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`mailto:${email}`} className="hover:text-white">
                  {email}
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

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Yaazh Cabs. Travel safe, reach happy.</p>
          <button
            type="button"
            onClick={toTop}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 uppercase tracking-[0.18em] text-white/70 hover:border-primary hover:text-primary"
          >
            <ArrowUp className="size-3.5" /> Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
