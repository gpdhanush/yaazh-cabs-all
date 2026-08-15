"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Reveal } from "./motion-primitives";

const steps = [
  { n: "01", title: "Share your trip", body: "Fill the booking form with pickup, drop, date, time and vehicle." },
  { n: "02", title: "Instant confirmation", body: "Details reach our desk on WhatsApp and we call back to confirm." },
  { n: "03", title: "Driver assigned", body: "You get the driver name, car number and phone before pickup." },
  { n: "04", title: "Travel & pay", body: "Reach safely. Pay by cash, UPI or bank transfer after the ride." },
];

const DRAW_MS = 2800;
const HOLD_MS = 800;
const LINE_MS = 900;
const ease = [0.45, 0.05, 0.2, 1] as const;

function StepCard({
  step,
  phase,
}: {
  step: (typeof steps)[number];
  phase: "idle" | "drawing" | "done";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inset = 2;
  const r = 16;
  const w = Math.max(0, size.w - inset * 2);
  const h = Math.max(0, size.h - inset * 2);
  const path =
    w > r * 2 && h > r * 2
      ? `M ${inset + r} ${inset} H ${inset + w - r} A ${r} ${r} 0 0 1 ${inset + w} ${inset + r} V ${inset + h - r} A ${r} ${r} 0 0 1 ${inset + w - r} ${inset + h} H ${inset + r} A ${r} ${r} 0 0 1 ${inset} ${inset + h - r} V ${inset + r} A ${r} ${r} 0 0 1 ${inset + r} ${inset} Z`
      : "";

  const drawn = phase === "drawing" || phase === "done";

  return (
    <div ref={ref} className="relative h-full rounded-2xl border border-border bg-card/70 p-6">
      {path ? (
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <motion.path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
            transition={
              phase === "drawing"
                ? { pathLength: { duration: DRAW_MS / 1000, ease: "linear" }, opacity: { duration: 0.2 } }
                : { duration: phase === "idle" ? 0.45 : 0 }
            }
          />
        </svg>
      ) : null}

      <span
        className={`font-data text-3xl font-semibold transition-colors duration-500 ${
          phase === "idle" ? "text-brand/35" : "text-brand"
        }`}
      >
        {step.n}
      </span>
      <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
    </div>
  );
}

function Connector({
  filled,
  drawing,
  smHorizontal,
}: {
  filled: boolean;
  drawing: boolean;
  smHorizontal: boolean;
}) {
  const grow = filled || drawing;
  const duration = drawing ? LINE_MS / 1000 : filled ? 0 : 0.4;

  return (
    <>
      <span
        className="pointer-events-none absolute left-[calc(100%+2px)] top-1/2 z-10 hidden h-[2.5px] w-[calc(var(--step-gap)-4px)] origin-left lg:block"
        aria-hidden
      >
        <span className="absolute inset-0 rounded-full bg-border" />
        <motion.span
          className="absolute inset-0 origin-left rounded-full bg-primary"
          initial={false}
          animate={{ scaleX: grow ? 1 : 0 }}
          transition={{ duration, ease }}
        />
      </span>
      {smHorizontal ? (
        <span
          className="pointer-events-none absolute left-[calc(100%+2px)] top-1/2 z-10 hidden h-[2.5px] w-[calc(var(--step-gap)-4px)] origin-left sm:block lg:hidden"
          aria-hidden
        >
          <span className="absolute inset-0 rounded-full bg-border" />
          <motion.span
            className="absolute inset-0 origin-left rounded-full bg-primary"
            initial={false}
            animate={{ scaleX: grow ? 1 : 0 }}
            transition={{ duration, ease }}
          />
        </span>
      ) : (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-10 hidden h-8 w-[2.5px] -translate-x-1/2 origin-top sm:block lg:hidden"
          aria-hidden
        >
          <span className="absolute inset-0 rounded-full bg-border" />
          <motion.span
            className="absolute inset-0 origin-top rounded-full bg-primary"
            initial={false}
            animate={{ scaleY: grow ? 1 : 0 }}
            transition={{ duration, ease }}
          />
        </span>
      )}
      <span
        className="pointer-events-none absolute left-10 top-full z-10 h-4 w-[2.5px] origin-top sm:hidden"
        aria-hidden
      >
        <span className="absolute inset-0 rounded-full bg-border" />
        <motion.span
          className="absolute inset-0 origin-top rounded-full bg-primary"
          initial={false}
          animate={{ scaleY: grow ? 1 : 0 }}
          transition={{ duration, ease }}
        />
      </span>
    </>
  );
}

export function BookingProcess() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.35 });
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (reduce || !inView) {
      setActive(-1);
      return;
    }

    let step = 0;
    setActive(0);
    let timer = 0;

    const tick = () => {
      timer = window.setTimeout(() => {
        step += 1;
        if (step >= steps.length) {
          timer = window.setTimeout(() => {
            setActive(-1);
            timer = window.setTimeout(() => {
              step = 0;
              setActive(0);
              tick();
            }, 400);
          }, 1400);
          return;
        }
        setActive(step);
        tick();
      }, DRAW_MS + HOLD_MS);
    };

    tick();
    return () => window.clearTimeout(timer);
  }, [inView, reduce]);

  return (
    <section ref={sectionRef} className="py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.28em] text-brand sm:text-[11px]">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Booked in <span className="text-brand">four simple steps</span>
          </h2>
        </Reveal>

        <ol
          className="mt-10 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8 lg:grid-cols-4 lg:gap-x-10"
          style={{ ["--step-gap" as string]: "2.5rem" }}
        >
          {steps.map((s, i) => {
            const phase = reduce ? "done" : i < active ? "done" : i === active ? "drawing" : "idle";
            const showLink = i < steps.length - 1;
            return (
              <li key={s.n} className="relative">
                <StepCard step={s} phase={phase} />
                {showLink ? (
                  <Connector
                    filled={reduce || i < active - 1}
                    drawing={!reduce && i === active - 1}
                    smHorizontal={i % 2 === 0}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
