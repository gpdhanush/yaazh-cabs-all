import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { SiteFooter } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { Toaster } from "@/components/ui/sonner";
import {
  isActiveTripStatus,
  loadBookingCache,
  stagesFromTrack,
  statusLabel,
  type LocalBookingCache,
} from "@/lib/bookings";
import { ADMIN_WHATSAPP, PHONE_PRIMARY, BOOKING_FARE_NOTE } from "@/lib/site-data";
import {
  ApiError,
  formatTripType,
  isApiConfigured,
  mediaUrl,
  trackBooking,
  type BookingTrackSummary,
  type TrackedBooking,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { defaultOgMeta } from "@/lib/analytics";

const title = "Track Your Booking | Yaazh Cabs Udumalpet";
const description =
  "Check your Yaazh Cabs booking status — confirmation, driver assignment, cab number and pickup time updates using your booking reference or mobile number.";
const url = "https://yaazhcabs.in/status";

type View = "form" | "list" | "detail";

/** One field: 10-digit mobile → phone lookup; anything else → booking reference. */
function parseTrackQuery(raw: string): { booking_reference?: string; customer_phone?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const digits = trimmed.replace(/\D/g, "");
  const looksLikePhone = digits.length >= 10 && /^[\d\s+()-]+$/.test(trimmed);
  if (looksLikePhone) return { customer_phone: digits.slice(-10) };
  return { booking_reference: trimmed };
}

export const Route = createFileRoute("/status")({
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s["ref"] === "string" ? (s["ref"] as string) : "",
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
      ...defaultOgMeta,
    ],
    links: [{ rel: "canonical", href: url }],
  }),
  component: StatusPage,
});

function StatusPage() {
  const { ref } = Route.useSearch();
  const [view, setView] = useState<View>("form");
  const [query, setQuery] = useState(ref);
  const [booking, setBooking] = useState<TrackedBooking | null>(null);
  const [bookingList, setBookingList] = useState<BookingTrackSummary[]>([]);
  const [listPhone, setListPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<LocalBookingCache[]>([]);

  useEffect(() => {
    setRecent(loadBookingCache());
    if (ref) setQuery(ref);
  }, [ref]);

  const runTrack = useCallback(
    async (payload: { booking_reference?: string; customer_phone?: string }) => {
      if (!isApiConfigured()) {
        throw new ApiError("Tracking API is not configured (VITE_API_URL).", 503);
      }
      return trackBooking(payload);
    },
    [],
  );

  const lookup = useCallback(
    async (raw: string) => {
      const payload = parseTrackQuery(raw);
      setQuery(raw.trim());
      setSearched(true);
      setError(null);
      setBookingList([]);
      setListPhone("");

      if (!payload.booking_reference && !payload.customer_phone) {
        setBooking(null);
        setView("form");
        setError("Enter your booking number or 10-digit mobile number.");
        return;
      }

      setLoading(true);
      try {
        const data = await runTrack(payload);
        if (data.mode === "list") {
          setBooking(null);
          setBookingList(data.bookings);
          setListPhone(payload.customer_phone ?? "");
          setView("list");
        } else if (data.booking) {
          setBooking(data.booking);
          setView("detail");
        } else {
          setBooking(null);
          setView("form");
          setError("Booking not found.");
        }
      } catch (err) {
        setBooking(null);
        setView("form");
        setError(err instanceof ApiError ? err.message : "Booking not found.");
      } finally {
        setLoading(false);
      }
    },
    [runTrack],
  );

  const loadDetail = useCallback(
    async (bookingRef: string) => {
      setError(null);
      setLoading(true);
      try {
        const data = await runTrack({ booking_reference: bookingRef });
        if (data.mode === "detail" && data.booking) {
          setBooking(data.booking);
          setQuery(data.booking.booking_reference);
          setView("detail");
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Booking not found.");
      } finally {
        setLoading(false);
      }
    },
    [runTrack],
  );

  const refreshDetail = useCallback(async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const data = await runTrack({ booking_reference: booking.booking_reference });
      if (data.mode === "detail" && data.booking) setBooking(data.booking);
    } catch {
      /* keep last known state on refresh failure */
    } finally {
      setLoading(false);
    }
  }, [booking, runTrack]);

  useEffect(() => {
    if (!ref) return;
    void lookup(ref);
  }, [ref, lookup]);

  useEffect(() => {
    if (view !== "detail" || !booking || !isActiveTripStatus(booking.status)) return;
    const id = window.setInterval(() => {
      void refreshDetail();
    }, 20000);
    return () => window.clearInterval(id);
  }, [view, booking, refreshDetail]);

  const goBack = () => {
    if (view === "detail" && bookingList.length > 0) {
      setBooking(null);
      setView("list");
      return;
    }
    setView("form");
    setBooking(null);
    setBookingList([]);
    setSearched(false);
    setError(null);
  };

  const showForm = view === "form";
  const showList = view === "list";
  const showDetail = view === "detail" && booking;
  const showNotFound = searched && !showDetail && !showList && !loading;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 md:px-8">
          {view !== "form" ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowLeft className="size-4" /> Back to site
            </Link>
          )}
          <a
            href={`tel:+91${PHONE_PRIMARY.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Phone className="size-4" /> Call desk
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-16">
        <p className="section-kicker">Booking status</p>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
          Track your <span className="text-brand">pickup &amp; driver</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter your <strong className="font-medium text-foreground">booking number</strong> or{" "}
          <strong className="font-medium text-foreground">mobile number</strong> — one is enough.
        </p>

        {showForm && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void lookup(query);
              }}
              className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Booking number or mobile number"
                aria-label="Booking number or mobile number"
                className="w-full rounded-[5px] border border-border bg-surface-2/40 px-4 py-3 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-70"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Check status
              </button>
            </form>

            {recent.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recent.slice(0, 4).map((b) => (
                  <button
                    key={b.ref}
                    type="button"
                    onClick={() => void lookup(b.ref)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-brand/50 hover:text-foreground"
                  >
                    {b.ref}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {showNotFound && (
          <div className="mt-8 rounded-2xl border border-border bg-card/70 p-6">
            <p className="text-sm font-semibold">{error ?? "No booking found."}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try the booking number (e.g. CAB202608160001) or the 10-digit mobile used at booking.
            </p>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
                `Hi Yaazh Cabs, I'd like the status of my booking: ${query}`,
              )}`}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-flex items-center gap-2 rounded-[5px] border border-brand/40 bg-brand/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand"
            >
              <MessageCircle className="size-4" /> Ask on WhatsApp
            </a>
          </div>
        )}

        {showList && (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold">Select a booking</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {listPhone
                  ? `We found ${bookingList.length} bookings for +91 ${listPhone}. Tap one to view status.`
                  : `We found ${bookingList.length} bookings. Tap one to view status.`}
              </p>
            </div>
            <ul className="space-y-3">
              {bookingList.map((item) => (
                <BookingListCard
                  key={item.id}
                  item={item}
                  loading={loading}
                  onSelect={() => void loadDetail(item.booking_reference)}
                />
              ))}
            </ul>
          </div>
        )}

        {showDetail && (
          <StatusCard booking={booking} onRefresh={() => void refreshDetail()} refreshing={loading} />
        )}
      </div>

      <SiteFooter />
      <ChatWidget />
      <Toaster position="top-center" />
    </main>
  );
}

function BookingListCard({
  item,
  loading,
  onSelect,
}: {
  item: BookingTrackSummary;
  loading: boolean;
  onSelect: () => void;
}) {
  const pickupAt = new Date(item.pickup_at);
  const pickupLabel = Number.isNaN(pickupAt.getTime())
    ? item.pickup_at
    : pickupAt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={loading}
        className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card/70 p-4 text-left transition hover:border-brand/40 disabled:opacity-70 sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-data text-lg font-semibold text-brand">{item.booking_reference}</p>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                item.status === "pending" ? "status-pending" : "status-confirmed",
              )}
            >
              {statusLabel(item.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatTripType(item.trip_type)}</p>
          <p className="mt-1 truncate text-sm">
            {item.pickup_location} → {item.drop_location}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Pickup · {pickupLabel}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

function StatusCard({
  booking,
  onRefresh,
  refreshing,
}: {
  booking: TrackedBooking;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const stages = stagesFromTrack(booking);
  const assigned = Boolean(booking.driver);
  const pickupAt = new Date(booking.pickup_at);
  const pickupLabel = Number.isNaN(pickupAt.getTime())
    ? booking.pickup_at
    : pickupAt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-2xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Reference</p>
            <p className="font-data text-2xl font-semibold text-brand">{booking.booking_reference}</p>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              booking.status === "pending" ? "status-pending" : "status-confirmed",
            )}
          >
            {statusLabel(booking.status)}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Passenger" value={`${booking.customer_name} · +91 ${booking.customer_phone}`} />
          <Row label="Trip" value={formatTripType(booking.trip_type)} />
          <Row label="Route" value={`${booking.pickup_location} → ${booking.drop_location}`} />
          <Row label="Pickup" value={pickupLabel} />
          <Row
            label="Approx fare"
            value={`₹${Number(booking.estimated_total || 0).toLocaleString("en-IN")}`}
          />
          <Row label="Payment" value={booking.payment_status.replace(/_/g, " ")} />
        </dl>
        <p className="mt-4 rounded-lg border border-brand/40 bg-primary/12 px-3 py-2 text-xs font-medium text-brand">
          {BOOKING_FARE_NOTE}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Live updates</h2>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
        <ol className="mt-5 space-y-4">
          {stages.map((s) => (
            <li key={s.key} className="flex gap-3">
              {s.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
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

      {assigned && booking.driver ? (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Your driver</h2>
          <div className="mt-3 flex items-center gap-3">
            {mediaUrl(booking.driver.photo_url) || booking.driver.id ? (
              <img
                src={
                  mediaUrl(booking.driver.photo_url) ??
                  mediaUrl(`/api/v1/public/drivers/${booking.driver.id}/photo`) ??
                  ""
                }
                alt={booking.driver.name}
                className="size-12 shrink-0 rounded-[5px] object-cover bg-primary/15"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <p className="text-sm text-muted-foreground">
              {booking.driver.name}
              {booking.vehicle
                ? ` · ${booking.vehicle.name}${booking.vehicle.registration ? ` · ${booking.vehicle.registration}` : ""}`
                : ""}
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={`tel:+91${booking.driver.phone.replace(/\D/g, "").slice(-10)}`}
              className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground"
            >
              <Phone className="size-4" /> Call driver
            </a>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
                `Hi Yaazh Cabs, update on booking ${booking.booking_reference} please.`,
              )}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-secondary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-secondary-foreground"
            >
              <MessageCircle className="size-4 text-brand" /> Message desk
            </a>
          </div>
        </div>
      ) : null}
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
