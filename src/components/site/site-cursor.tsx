"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

const INTERACTIVE = "a, button, [role='button'], summary, label, .cursor-pointer";
const TYPING = "input, textarea, select, [contenteditable='true']";

export function SiteCursor() {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = wrap.current;
    if (!el) return;
    document.documentElement.classList.add("has-custom-cursor");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let hover = false;
    let typing = false;
    let shown = false;
    let raf = 0;

    const paint = () => {
      tx += (x - tx) * 0.18;
      ty += (y - ty) * 0.18;
      el.style.setProperty("--cx", `${x}px`);
      el.style.setProperty("--cy", `${y}px`);
      el.style.setProperty("--rx", `${tx}px`);
      el.style.setProperty("--ry", `${ty}px`);
      el.dataset.state = !shown || typing ? "hide" : hover ? "hover" : "move";
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      shown = true;
      const t = e.target;
      if (!(t instanceof Element)) return;
      typing = Boolean(t.closest(TYPING));
      hover = !typing && Boolean(t.closest(INTERACTIVE));
    };
    const hide = () => {
      shown = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", hide);
    document.addEventListener("mouseleave", hide);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", hide);
      document.removeEventListener("mouseleave", hide);
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <div
      ref={wrap}
      data-state="hide"
      className="site-cursor pointer-events-none fixed inset-0 z-[200] hidden lg:block"
      aria-hidden
    >
      <span className="site-cursor-glow" />
      <svg
        className="site-cursor-pointer"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
      >
        <path
          d="M4.2 2.4 20.1 14.2l-7.1.4 3.6 7.4-3.2 1.5-3.6-7.5-5.6 4.6Z"
          fill="var(--primary)"
          stroke="#111827"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
