import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, MessageCircle, Phone, RefreshCw } from "lucide-react";
import { SiteFooter } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { Toaster } from "@/components/ui/sonner";
import { driverFor, findBooking, loadBookings, stagesFor, type Booking } from "@/lib/bookings";
import { ADMIN_WHATSAPP, PHONE_PRIMARY } from "@/lib/site-data";
import { cn } from "@/lib/utils";

const title = "Track Your Booking | Yaazh Cabs Udumalpet";
const description =
  "Check your Yaazh Cabs booking status — confirmation, driver assignment, cab number and pickup time updates using your booking reference or mobile number.";
const url = "https://luxe-motion-ride.lovable.app/status";

export const Route = createFileRoute("/status")({
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : "",
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  }),
  component: StatusPage,
});

function StatusPage() {
  const { ref } = Route.useSearch();
  const [query, setQuery] = useState(ref);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState<Booking[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    setRecent(loadBookings());
    if (ref) {
      setBooking(findBooking(ref) ?? null);
      setSearched(true);
    }
  }, [ref]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 20000);
    return () => window.clearInterval(id);
  }, []);

  const lookup = (value: string) => {
    setQuery(value);
    setBooking(findBooking(value) ?? null);
    setSearched(true);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> Back to site
          </Link>
          <a
            href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-gold)] px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Phone className="size-4" /> Call desk
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-primary">Booking status</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold md:text-4xl">
          Track your <span className="text-gradient-gold">pickup &amp; driver</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter your booking reference (e.g. YC260810 1234) or the mobile number you booked with.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(query);
          }}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="YC2608101234 or 9360055761"
            aria-label="Booking reference or mobile number"
            className="w-full rounded-[5px] border border-border bg-surface-2/40 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="shrink-0 rounded-[5px] bg-[image:var(--gradient-gold)] px-6 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground"
          >
            Check status
          </button>
        </form>

        {recent.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {recent.slice(0, 4).map((b) => (
              <button
                key={b.ref}
                onClick={() => lookup(b.ref)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                {b.ref}
              </button>
            ))}
          </div>
        )}

        {searched && !booking && (
          <div className="mt-8 rounded-2xl border border-border bg-card/70 p-6">
            <p className="text-sm font-semibold">No booking found for “{query}”.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Bookings are tracked on the device you booked from. If you booked by phone or from
              another device, message us and we'll share the live status.
            </p>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
                `Hi Yaazh Cabs, I'd like the status of my booking: ${query}`,
              )}`}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-flex items-center gap-2 rounded-[5px] border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary"
            >
              <MessageCircle className="size-4" /> Ask on WhatsApp
            </a>
          </div>
        )}

        {booking && <StatusCard booking={booking} onRefresh={() => setTick((t) => t + 1)} />}
      </div>

      <SiteFooter />
      <ChatWidget />
      <Toaster position="top-center" />
    </main>
  );
}

function StatusCard({ booking, onRefresh }: { booking: Booking; onRefresh: () => void }) {
  const stages = stagesFor(booking);
  const driver = driverFor(booking);
  const assigned = stages.find((s) => s.key === "driver")?.done ?? false;
  const current = [...stages].reverse().find((s) => s.done);

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-2xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Reference</p>
            <p className="font-display text-2xl font-extrabold text-gradient-gold">{booking.ref}</p>
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary">
            {current?.title ?? "Request received"}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Passenger" value={`${booking.name} · +91 ${booking.mobile}`} />
          <Row label="Trip" value={booking.trip} />
          <Row label="Route" value={`${booking.pickup} → ${booking.drop}`} />
          <Row label="Pickup" value={`${booking.date}, ${booking.time}`} />
          <Row label="Vehicle" value={`${booking.vehicle} · ₹${booking.perKm}/km`} />
          <Row label="Approx fare" value={`₹${booking.estimate.toLocaleString("en-IN")}`} />
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Live updates</h2>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
        <ol className="mt-5 space-y-4">
          {stages.map((s) => (
            <li key={s.key} className="flex gap-3">
              {s.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/50" />
              )}
              <div>
                <p className={cn("text-sm font-semibold", !s.done && "text-muted-foreground")}>
                  {s.title}
                  {s.at && <span className="ml-2 text-xs font-normal text-muted-foreground">{s.at}</span>}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {assigned && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Your driver</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {driver.name} · {booking.vehicle} · {driver.car}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={`tel:+91${driver.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[image:var(--gradient-gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground"
            >
              <Phone className="size-4" /> Call driver
            </a>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
                `Hi Yaazh Cabs, update on booking ${booking.ref} please.`,
              )}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              <MessageCircle className="size-4 text-primary" /> Message desk
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
