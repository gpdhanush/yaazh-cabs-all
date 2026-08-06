"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Slider } from "@/components/ui/slider";
import { vehicles } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion-primitives";

function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const from = display;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 600, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>₹{display.toLocaleString("en-IN")}</>;
}

export function FareEstimator() {
  const [km, setKm] = useState(60);
  const [vehicleId, setVehicleId] = useState(vehicles[0]!.id);
  const [roundTrip, setRoundTrip] = useState(false);

  const v = vehicles.find((x) => x.id === vehicleId)!;
  const distance = roundTrip ? km * 2 : km;
  const total = Math.round(v.base + distance * v.perKm);

  return (
    <section id="fare" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-primary">Fare estimator</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-extrabold md:text-5xl">
            Know your fare <span className="text-gradient-gold">before you ride</span>
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <div className="glass grid gap-10 rounded-3xl p-7 md:p-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Vehicle</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {vehicles.map((veh) => (
                  <button
                    key={veh.id}
                    onClick={() => setVehicleId(veh.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs transition-all duration-300",
                      veh.id === vehicleId
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {veh.name}
                  </button>
                ))}
              </div>

              <div className="mt-9 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Distance</p>
                <p className="font-display text-sm font-bold text-primary">{km} km</p>
              </div>
              <Slider
                className="mt-4"
                value={[km]}
                min={10}
                max={600}
                step={5}
                onValueChange={(val) => setKm(val[0] ?? 10)}
                aria-label="Trip distance in kilometres"
              />

              <button
                onClick={() => setRoundTrip((r) => !r)}
                className={cn(
                  "mt-8 inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs transition-colors",
                  roundTrip ? "border-primary text-primary" : "border-border text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative h-4 w-8 rounded-full transition-colors",
                    roundTrip ? "bg-primary" : "bg-muted",
                  )}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                      "absolute top-0.5 size-3 rounded-full bg-background",
                      roundTrip ? "left-4.5" : "left-0.5",
                    )}
                  />
                </span>
                Round trip
              </button>
            </div>

            <div className="relative flex flex-col justify-between rounded-2xl border border-primary/25 bg-surface/60 p-7">
              <AnimatePresence mode="wait">
                <motion.img
                  key={v.id}
                  src={v.image}
                  alt={`${v.name} fare estimate`}
                  loading="lazy"
                  initial={{ opacity: 0, x: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="mx-auto h-28 w-auto object-contain"
                />
              </AnimatePresence>
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Base fare</span>
                  <span className="text-foreground">₹{v.base}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {distance} km × ₹{v.perKm}
                  </span>
                  <span className="text-foreground">₹{(distance * v.perKm).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Estimated total
                </p>
                <p className="mt-2 font-display text-5xl font-extrabold text-gradient-gold tabular-nums">
                  <AnimatedPrice value={total} />
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Indicative only. Tolls, parking and permits billed at actuals.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
