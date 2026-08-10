"use client";

/**
 * Static layout primitives. All scroll/hover animation was intentionally
 * removed — these keep the markup structure without any motion.
 */

import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return <div className={className}>{children}</div>;
}

export function StaggerGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function Magnetic({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  return <span className={cn("inline-block", className)}>{children}</span>;
}

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  return (
    <>
      {to.toLocaleString("en-IN")}
      {suffix}
    </>
  );
}
