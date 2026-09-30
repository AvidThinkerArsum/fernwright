"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";

/**
 * Mechanical odometer. The ones wheel turns continuously; every other wheel only
 * turns in the last tenth of its neighbour's revolution, like a real carry. Wheels
 * above the current magnitude stay blank, so it never shows a leading zero.
 */
export function Odometer({ value, final, className = "" }: { value: MotionValue<number>; final: number; className?: string }) {
  const digits = String(Math.round(final)).length;
  const places = Array.from({ length: digits }, (_, k) => digits - 1 - k);
  return (
    <span className={`inline-flex h-[1.1em] items-start leading-[1.1em] ${className}`} aria-label={`$${final.toLocaleString("en-US")}`}>
      <span aria-hidden>$</span>
      {places.map((p, k) => (
        <span key={p} className="inline-flex items-start" aria-hidden>
          <Wheel value={value} place={p} />
          {p > 0 && p % 3 === 0 && k < places.length - 1 ? <Shown value={value} place={p}>,</Shown> : null}
        </span>
      ))}
    </span>
  );
}

/** Visible only once the value reaches this wheel's place. */
function useShown(value: MotionValue<number>, place: number) {
  return useTransform(value, (v) => (place === 0 || v >= Math.pow(10, place) - 0.5 ? 1 : 0));
}

function Shown({ value, place, children }: { value: MotionValue<number>; place: number; children: React.ReactNode }) {
  const o = useShown(value, place);
  return <motion.span style={{ opacity: o }}>{children}</motion.span>;
}

function Wheel({ value, place }: { value: MotionValue<number>; place: number }) {
  const o = useShown(value, place);
  const y = useTransform(value, (v) => {
    const x = Math.max(0, v) / Math.pow(10, place);
    const base = Math.floor(x + 1e-6);
    const frac = x - base;
    const roll = place === 0 ? frac : Math.max(0, (frac - 0.9) / 0.1);
    const pos = (base % 10) + roll;
    return `${-pos * 1.1}em`;
  });
  return (
    <motion.span className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden leading-[1.1em]" style={{ opacity: o }}>
      <motion.span className="absolute left-0 top-0 flex w-full flex-col items-center" style={{ y }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
          <span key={i} className="block h-[1.1em]">
            {d}
          </span>
        ))}
      </motion.span>
    </motion.span>
  );
}
