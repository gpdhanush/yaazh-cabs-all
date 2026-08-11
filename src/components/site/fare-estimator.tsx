"use client";

import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { BOOKING_FARE_NOTE, vehicles } from "@/lib/site-data";
import {
  estimateFare,
  getAppConfig,
  getVehicleCategories,
  isApiConfigured,
  type FareEstimate,
  type VehicleCategory,
} from "@/lib/api";

function shortName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("sedan") || lower.includes("dzire")) return "Dzire";
  if (lower.includes("ertiga")) return "Ertiga";
  if (lower.includes("innova")) return "Innova";
  if (lower.includes("crysta") || lower.includes("suv")) return "SUV";
  if (lower.includes("tempo")) return "Tempo Traveller";
  return name;
}

export function FareEstimator() {
  const [km, setKm] = useState(60);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [vehicleId, setVehicleId] = useState(vehicles[0]!.id);
  const [quote, setQuote] = useState<FareEstimate | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [fareNote, setFareNote] = useState(BOOKING_FARE_NOTE);

  useEffect(() => {
    if (!isApiConfigured()) return;
    getVehicleCategories()
      .then((rows) => {
        setCategories(rows);
        if (rows[0]) setVehicleId(rows[0].id);
      })
      .catch(() => {
        /* fallback */
      });
    getAppConfig()
      .then((cfg) => {
        const note = cfg.settings?.["booking_fare_note"];
        if (note) setFareNote(note);
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

  const options = useMemo(() => {
    if (categories.length) {
      return categories.map((c) => ({
        id: c.id,
        name: shortName(c.name),
        perKm: c.one_way_rate_per_km,
        base: 0,
        batta: c.driver_batta,
      }));
    }
    return vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      perKm: v.perKm,
      base: v.base,
      batta: 0,
    }));
  }, [categories]);

  const vehicle = options.find((v) => v.id === vehicleId) ?? options[0]!;
  const localTotal = vehicle.base + km * vehicle.perKm + vehicle.batta;

  useEffect(() => {
    if (!isApiConfigured() || !categories.length) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setQuoting(true);
      try {
        const data = await estimateFare({
          vehicle_category_id: vehicle.id,
          trip_type: "one_way",
          distance_km: km,
        });
        if (!cancelled) setQuote(data);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [km, vehicle.id, categories.length]);

  const total = quote?.estimated_total ?? localTotal;
  const base = quote?.base_fare ?? vehicle.base;
  const distanceFare = quote?.distance_fare ?? km * vehicle.perKm;
  const rate = quote?.rate_per_km ?? vehicle.perKm;
  const batta = quote?.driver_batta ?? vehicle.batta;
  const gst = quote?.gst_amount ?? 0;

  return (
    <section id="fare" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-8 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand sm:text-[11px]">
              Fare estimator
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
              Know the price <span className="text-brand">before you book</span>
            </h2>

            <div className="mt-8 rounded-xl border border-border bg-background p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <label htmlFor="km-slider" className="font-medium text-foreground">
                  Distance
                </label>
                <span className="rounded-md bg-primary px-2.5 py-1 font-data text-sm font-semibold text-primary-foreground">
                  {km} km
                </span>
              </div>

              <div className="mt-6">
                <Slider
                  id="km-slider"
                  min={5}
                  max={500}
                  step={5}
                  value={[km]}
                  onValueChange={(v) => setKm(v[0] ?? 60)}
                  aria-label="Trip distance in kilometres"
                />
              </div>

              <div className="mt-3 flex justify-between text-xs font-medium text-muted-foreground">
                <span>5 km</span>
                <span>250 km</span>
                <span>500 km</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {options.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-medium",
                    v.id === vehicle.id
                      ? "border-brand bg-primary text-primary-foreground"
                      : "border-border bg-background text-body hover:border-brand/50 hover:text-foreground",
                  )}
                >
                  {v.name} · ₹{v.perKm}/km
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Estimated fare{quoting ? " · updating…" : quote ? " · live tariff" : ""}
            </p>
            <p className="mt-2 inline-flex w-fit items-center rounded-md bg-primary px-3 py-1.5 font-data text-3xl font-semibold text-primary-foreground sm:text-4xl">
              ₹{Math.round(total).toLocaleString("en-IN")}
            </p>
            <ul className="mt-6 space-y-2 border-t border-border pt-5 text-sm font-normal text-body">
              {base > 0 ? (
                <li className="flex justify-between gap-3">
                  <span>Base fare ({vehicle.name})</span>
                  <span className="font-data font-semibold text-foreground">
                    ₹{base.toLocaleString("en-IN")}
                  </span>
                </li>
              ) : null}
              <li className="flex justify-between gap-3">
                <span>
                  {km} km × ₹{rate}
                </span>
                <span className="font-data font-semibold text-foreground">
                  ₹{Math.round(distanceFare).toLocaleString("en-IN")}
                </span>
              </li>
              {batta > 0 ? (
                <li className="flex justify-between gap-3">
                  <span>Driver batta</span>
                  <span className="font-data font-semibold text-foreground">
                    ₹{batta.toLocaleString("en-IN")}
                  </span>
                </li>
              ) : null}
              {gst > 0 ? (
                <li className="flex justify-between gap-3">
                  <span>GST</span>
                  <span className="font-data font-semibold text-foreground">
                    ₹{gst.toLocaleString("en-IN")}
                  </span>
                </li>
              ) : null}
            </ul>
            <p className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              {fareNote}
            </p>
            <a
              href="#book"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground gold-ring hover:bg-primary-dark"
            >
              Book this ride
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
