import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Star } from "lucide-react";
import { BrandLogo } from "@/components/site/brand-logo";
import { SiteFooter } from "@/components/site/footer";
import {
  ApiError,
  formatTripType,
  getPublicFeedback,
  isApiConfigured,
  mediaUrl,
  submitPublicFeedback,
  type PublicFeedback,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_DRIVER_IMAGE = "/driver-default.png";

const PRESETS: Record<number, string[]> = {
  5: ["Punctual and professional", "Clean vehicle", "Smooth comfortable ride", "Very polite driver"],
  4: ["Good trip overall", "On-time pickup", "Comfortable ride", "Helpful driver"],
  3: ["Average experience", "Okay but can improve", "Ride was fine"],
  2: ["Pickup was delayed", "Vehicle not clean", "Could have been smoother"],
  1: ["Poor service", "Driver was rude", "Would not recommend"],
};

export const Route = createFileRoute("/feedback/$token")({
  head: () => ({
    meta: [
      { title: "Rate your trip | Yaazh Cabs" },
      {
        name: "description",
        content: "Share a rating and short review for your Yaazh Cabs trip.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ params }) => {
    if (!isApiConfigured()) return { data: null as PublicFeedback | null, error: "Feedback is not available right now." };
    try {
      const data = await getPublicFeedback(params.token);
      return { data, error: null as string | null };
    } catch (err) {
      return {
        data: null as PublicFeedback | null,
        error: err instanceof ApiError ? err.message : "This feedback link is invalid or expired.",
      };
    }
  },
  component: FeedbackPage,
});

function FeedbackPage() {
  const { token } = Route.useParams();
  const loaded = Route.useLoaderData();
  const [rating, setRating] = useState(loaded.data?.submitted_rating ?? 0);
  const [selected, setSelected] = useState<string[]>(
    loaded.data?.submitted_review
      ? loaded.data.submitted_review.split(". ").filter(Boolean)
      : [],
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(loaded.data?.already_submitted ?? false);
  const [error, setError] = useState<string | null>(null);

  const presets = PRESETS[rating] ?? [];
  const data = loaded.data;

  const reviewText = useMemo(() => {
    const parts = [...selected];
    if (note.trim()) parts.push(note.trim());
    return parts.join(". ");
  }, [selected, note]);

  async function onSubmit() {
    if (!data || rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitPublicFeedback(token, { rating, review: reviewText || undefined });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <BrandLogo className="h-8" />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 py-8 md:py-12">
        <p className="section-kicker">Trip feedback</p>
        <h1 className="mt-2 font-display text-3xl font-bold">How was your ride?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap a star, pick a quick comment, and send. It takes under a minute.
        </p>

        {loaded.error || !data ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <p className="font-semibold">{loaded.error ?? "Link not found."}</p>
            <p className="mt-2 text-sm text-muted-foreground">Ask Yaazh Cabs for a new feedback link.</p>
          </div>
        ) : done ? (
          <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h2 className="mt-3 font-display text-xl font-bold">Thank you</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your rating is in. We use this to keep Yaazh trips consistent.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Trip</p>
              <p className="mt-1 font-data text-lg font-semibold text-brand">{data.booking_reference}</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <Row label="Hi" value={data.customer_name} />
                <Row label="Route" value={`${data.pickup_location} → ${data.drop_location}`} />
                <Row label="Type" value={formatTripType(data.trip_type)} />
                <Row label="Pickup" value={formatWhen(data.pickup_at)} />
                <Row
                  label="Fare"
                  value={`₹${Number(data.final_total ?? data.estimated_total).toLocaleString("en-IN")}`}
                />
              </dl>
            </section>

            {data.driver ? (
              <section className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Driver</p>
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={
                      mediaUrl(data.driver.photo_url) ??
                      (data.driver.id
                        ? mediaUrl(`/api/v1/public/drivers/${data.driver.id}/photo`)
                        : null) ??
                      DEFAULT_DRIVER_IMAGE
                    }
                    alt=""
                    className="size-14 shrink-0 rounded-full bg-primary/10 object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_DRIVER_IMAGE;
                    }}
                  />
                  <div>
                    <p className="font-semibold">{data.driver.name}</p>
                    {data.vehicle ? (
                      <p className="text-sm text-muted-foreground">
                        {data.vehicle.name}
                        {data.vehicle.registration ? ` · ${data.vehicle.registration}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">Driver details will appear once assigned.</p>
            )}

            {!data.can_submit ? (
              <p className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                Feedback opens after this trip is marked completed.
              </p>
            ) : (
              <>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold">Your rating</p>
                  <div className="mt-3 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setRating(n);
                          setSelected([]);
                        }}
                        className="rounded-full p-1"
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      >
                        <Star
                          className={cn(
                            "size-9",
                            n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </section>

                {rating > 0 ? (
                  <section className="rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-semibold">Quick comments</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {presets.map((item) => {
                        const on = selected.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              setSelected((prev) =>
                                on ? prev.filter((x) => x !== item) : [...prev, item],
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium",
                              on
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-4 block text-sm font-semibold" htmlFor="extra-note">
                      Anything else?
                    </label>
                    <textarea
                      id="extra-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={400}
                      placeholder="Optional extra note"
                      className="mt-2 w-full rounded-[5px] border border-border bg-surface-2/40 px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                  </section>
                ) : null}

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <button
                  type="button"
                  disabled={busy || rating < 1}
                  onClick={() => void onSubmit()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[5px] bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Send feedback
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
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

function formatWhen(raw: string) {
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
