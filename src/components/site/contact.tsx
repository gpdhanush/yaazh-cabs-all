"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
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
import { ApiError, getAppConfig, isApiConfigured, submitContact } from "@/lib/api";

type ContactInfo = {
  phonePrimary: string;
  phoneSecondary: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  mapsShare: string;
  mapEmbed: string;
};

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function formatPhoneDisplay(raw: string) {
  const d = digits(raw).slice(-10);
  if (d.length !== 10) return raw;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

function buildEmbed(lat: string | null | undefined, lng: string | null | undefined) {
  if (!lat || !lng) return MAP_EMBED_URL;
  return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

export function Contact() {
  const [info, setInfo] = useState<ContactInfo>({
    phonePrimary: PHONE_PRIMARY,
    phoneSecondary: PHONE_SECONDARY,
    whatsapp: ADMIN_WHATSAPP,
    email: ADMIN_EMAIL,
    address: BUSINESS_ADDRESS,
    hours: BUSINESS_HOURS,
    mapsShare: MAPS_SHARE_URL,
    mapEmbed: MAP_EMBED_URL,
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isApiConfigured()) return;
    getAppConfig()
      .then((cfg) => {
        const s = cfg.settings ?? {};
        setInfo((prev) => ({
          phonePrimary: s["support_phone"] ? formatPhoneDisplay(s["support_phone"]) : prev.phonePrimary,
          phoneSecondary: s["support_phone_secondary"]
            ? formatPhoneDisplay(s["support_phone_secondary"])
            : prev.phoneSecondary,
          whatsapp: s["whatsapp_number"] ? digits(s["whatsapp_number"]) : prev.whatsapp,
          email: s["support_email"] || prev.email,
          address: s["business_address"] || prev.address,
          hours: s["business_hours"] || prev.hours,
          mapsShare: s["maps_share_url"] || prev.mapsShare,
          mapEmbed: buildEmbed(s["map_lat"], s["map_lng"]),
        }));
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const contactRows = useMemo(
    () => [
      {
        icon: Phone,
        label: "Call us",
        body: (
          <span className="flex flex-col gap-1">
            <a href={`tel:+91${digits(info.phonePrimary).slice(-10)}`} className="hover:text-brand">
              {info.phonePrimary}
            </a>
            <a href={`tel:+91${digits(info.phoneSecondary).slice(-10)}`} className="hover:text-brand">
              {info.phoneSecondary}
            </a>
          </span>
        ),
      },
      {
        icon: MessageCircle,
        label: "WhatsApp",
        body: (
          <a
            href={`https://wa.me/${digits(info.whatsapp)}`}
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
          <a href={`mailto:${info.email}`} className="hover:text-brand">
            {info.email}
          </a>
        ),
      },
      {
        icon: MapPin,
        label: "Location",
        body: info.address,
      },
      {
        icon: Clock,
        label: "Hours",
        body: info.hours,
      },
    ],
    [info],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = digits(phone);
    if (!name.trim() || cleanPhone.length < 10 || message.trim().length < 5) {
      toast.error("Name, valid mobile and a short message are required.");
      return;
    }
    if (!isApiConfigured()) {
      toast.error("Contact API is not configured.");
      return;
    }
    setSending(true);
    try {
      const payload: {
        name: string;
        phone: string;
        message: string;
        subject: string;
        email?: string;
      } = {
        name: name.trim(),
        phone: cleanPhone.slice(-10),
        subject: "Website enquiry",
        message: message.trim(),
      };
      if (email.trim()) payload.email = email.trim();
      await submitContact(payload);
      toast.success("Enquiry sent. We'll get back to you shortly.");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send enquiry.");
    } finally {
      setSending(false);
    }
  };

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
          Bookings, airport transfers and tour queries — call, WhatsApp or send an enquiry. We confirm
          drivers quickly, day or night.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-14">
          <div>
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
                  href={info.mapsShare}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground gold-ring"
                >
                  Open in Google Maps
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
            </ul>

            <form onSubmit={onSubmit} className="mt-10 space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Send an enquiry</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                aria-label="Your name"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="Mobile number"
                inputMode="tel"
                maxLength={12}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                aria-label="Mobile number"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                type="email"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                aria-label="Email"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={4}
                className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                aria-label="Message"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-70"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Submit enquiry
              </button>
            </form>
          </div>

          <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:min-h-[360px] lg:min-h-full">
            <iframe
              title="Yaazh Cabs location on Google Maps"
              src={info.mapEmbed}
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
