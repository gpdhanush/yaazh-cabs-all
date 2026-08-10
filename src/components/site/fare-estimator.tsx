"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { vehicles } from "@/lib/site-data";

export function FareEstimator() {
  const [km, setKm] = useState(60);
  const [vehicleId, setVehicleId] = useState(vehicles[0]!.id);
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0]!;
  const total = vehicle.base + km * vehicle.perKm;

  return (
    <section id="fare" className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-8 rounded-2xl border border-border bg-card/70 p-6 md:p-10 lg:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-primary sm:text-[11px]">Fare estimator</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              Know the price <span className="text-gradient-gold">before you book</span>
            </h2>

            <div className="mt-8">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="km" className="text-muted-foreground">
                  Distance
                </label>
                <span className="font-semibold">{km} km</span>
              </div>
              <input
                id="km"
                type="range"
                min={5}
                max={500}
                step={5}
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                className="mt-3 w-full accent-primary"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs",
                    v.id === vehicleId
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v.name} · ₹{v.perKm}/km
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-border bg-surface-2/40 p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Estimated fare</p>
            <p className="mt-2 font-display text-4xl font-extrabold text-gradient-gold sm:text-5xl">
              ₹{total.toLocaleString("en-IN")}
            </p>
            <ul className="mt-6 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
              <li className="flex justify-between">
                <span>Base fare ({vehicle.name})</span>
                <span>₹{vehicle.base.toLocaleString("en-IN")}</span>
              </li>
              <li className="flex justify-between">
                <span>
                  {km} km × ₹{vehicle.perKm}
                </span>
                <span>₹{(km * vehicle.perKm).toLocaleString("en-IN")}</span>
              </li>
            </ul>
            <p className="mt-5 text-xs text-muted-foreground">
              Indicative only. Tolls, parking and permits are billed at actuals.
            </p>
            <a
              href="#book"
              className="mt-6 inline-flex items-center justify-center rounded-[5px] bg-[image:var(--gradient-gold)] px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground"
            >
              Book this ride
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
