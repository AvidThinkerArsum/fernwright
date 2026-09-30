"use client";

import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { useState } from "react";
import { money, pad2, variance as varianceText } from "@/lib/format";
import { SITE, heroTown, where, type HeroPreset } from "@/lib/site";
import { Sample } from "@/components/ui/Sample";
import { T } from "./model";
import { Odometer } from "./Odometer";
import { Stamp } from "./Stamp";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function CtaButtons({ dark = true, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      <a
        href="#costs"
        className={`focus-ring inline-flex h-12 items-center gap-2 rounded-[3px] px-5 text-[14px] font-medium transition-colors ${
          dark ? "bg-paper text-graphite hover:bg-white" : "bg-graphite text-paper hover:bg-graphite-2"
        }`}
      >
        What would mine cost? <span aria-hidden>↓</span>
      </a>
      <a
        href={SITE.licenseLookup}
        target="_blank"
        rel="noopener noreferrer"
        className={`focus-ring inline-flex h-12 items-center gap-2 rounded-[3px] border px-5 text-[14px] font-medium transition-colors ${
          dark ? "border-paper/60 text-paper backdrop-blur-sm hover:bg-paper/10" : "border-graphite/50 text-graphite hover:bg-graphite/5"
        }`}
      >
        Verify our license <span aria-hidden>↗</span>
      </a>
    </div>
  );
}

/**
 * Top line of the AS BUILT stamp. On a concept for a real business the figures on the
 * record are invented, so the stamp never puts that business's name on them.
 */
const stampTop = () => (SITE.showConceptBanner ? "CONCEPT · SAMPLE RECORD" : SITE.name.toUpperCase());

/**
 * The as-built record: a scrap of the title block that stays behind when the paper goes.
 * Its last row is the close-out box, so the stamp lands on its own square of paper and
 * never on a figure.
 */
export function Slip({
  preset,
  odometer,
  odometerOn,
  stamped,
  compact,
}: {
  preset: HeroPreset;
  odometer?: MotionValue<number>;
  /** 0 until the invoice total starts to roll; the row reads "———" until then. */
  odometerOn?: MotionValue<number>;
  stamped: boolean;
  compact?: boolean;
}) {
  const f = preset.facts;
  const v = f.invoiced - f.price;
  const row = `mono flex items-center justify-between border-t border-graphite/20 ${compact ? "px-3 py-1.5 text-[9.5px]" : "px-4 py-2 text-[11px]"}`;
  return (
    <div className="relative">
      <div className={`paper border border-graphite/50 text-graphite shadow-[0_18px_50px_rgba(0,0,0,0.35)] ${compact ? "w-[204px]" : "w-[300px]"}`}>
        <div className={`mono flex items-center justify-between ${compact ? "px-3 py-1.5 text-[8.5px]" : "px-4 py-2.5 text-[9.5px]"} text-graphite/60`}>
          <span>
            As-built record
            <Sample />
          </span>
          <span>Sheet {f.sheet}</span>
        </div>
        <div className={row}>
          <span className="text-graphite/60">Planned</span>
          <span className="font-medium">{money(f.price)}</span>
        </div>
        <div className={row}>
          <span className="text-graphite/60">Invoiced</span>
          <span className={`relative font-medium ${compact ? "text-[11px]" : "text-[13px]"}`}>
            {odometer ? (
              <>
                <motion.span className="inline-block" style={{ opacity: odometerOn ?? 1 }}>
                  <Odometer value={odometer} final={f.invoiced} />
                </motion.span>
                {odometerOn ? <NotYet on={odometerOn} /> : null}
              </>
            ) : (
              money(f.invoiced)
            )}
          </span>
        </div>
        <div className={row}>
          <span className="text-graphite/60">Variance</span>
          <span className="font-medium text-fir">{v === 0 ? "$0 ✓" : varianceText(v)}</span>
        </div>
        <div className={row}>
          <span className="text-graphite/60">Schedule</span>
          <span className="font-medium">
            {pad2(f.weeks)} / {pad2(f.weeks)} wks
          </span>
        </div>
        {/* Close-out box: sized so the whole stamp lands on paper, clear of every figure above it. */}
        <div className={`relative border-t border-graphite/35 ${compact ? "h-[84px] px-3 py-1.5" : "h-[114px] px-4 py-2.5"}`}>
          <span className={`mono block text-graphite/55 ${compact ? "text-[8px]" : "text-[9px]"}`}>Close-out</span>
          <span
            aria-hidden
            className={`absolute rounded-[6px] border border-dashed border-graphite/25 transition-opacity duration-300 ${stamped ? "opacity-0" : "opacity-100"} ${
              compact ? "bottom-[11px] right-[9px] h-[60px] w-[128px]" : "bottom-[14px] right-[14px] h-[84px] w-[180px]"
            }`}
          />
        </div>
      </div>
      <AnimatePresence>
        {stamped ? (
          <motion.div
            key="stamp"
            initial={{ scale: 1.9, rotate: -16, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 0.95 }}
            exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 560, damping: 24, mass: 0.9 }}
            className={`pointer-events-none absolute mix-blend-multiply ${compact ? "bottom-[9px] right-[7px] w-[134px]" : "bottom-[12px] right-[12px] w-[186px]"}`}
          >
            <Stamp top={stampTop()} bottom={`WK ${f.weeks}/${f.weeks} · VARIANCE ${varianceText(v)}`} className="w-full" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** "———" in the Invoiced row until the total starts to roll. */
function NotYet({ on }: { on: MotionValue<number> }) {
  const o = useTransform(on, (x) => 1 - x);
  return (
    <motion.span aria-hidden className="absolute inset-y-0 right-0 flex items-center text-graphite/35" style={{ opacity: o }}>
      ———
    </motion.span>
  );
}

/** The dark wash that settles over the photo as the sheet falls. Rendered under the sheet. */
export function AsBuiltScrim({ prog }: { prog: MotionValue<number> }) {
  const scrim = useTransform(prog, [0, T.fall[0], T.fall[1], 1], [0, 0, 1, 1]);
  return (
    <motion.div
      aria-hidden
      style={{ opacity: scrim }}
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(18,20,22,0.9)_0%,rgba(18,20,22,0.66)_36%,rgba(18,20,22,0.14)_60%,rgba(18,20,22,0)_74%)] lg:bg-[linear-gradient(0deg,rgba(18,20,22,0.8)_0%,rgba(18,20,22,0.5)_32%,rgba(18,20,22,0)_60%),radial-gradient(ellipse_62%_70%_at_0%_100%,rgba(18,20,22,0.6)_0%,rgba(18,20,22,0)_100%)]"
    />
  );
}

/** The last beat: paper gone, photo full-bleed, the invoice lands on the plan, stamp. */
export function AsBuilt({ preset, prog, mobile }: { preset: HeroPreset; prog: MotionValue<number>; mobile: boolean }) {
  const f = preset.facts;
  const copyO = useTransform(prog, [0, T.copy[0], T.copy[1], 1], [0, 0, 1, 1]);
  const copyY = useTransform(prog, [0, T.copy[0], T.copy[1], 1], [28, 28, 0, 0]);
  const slipO = useTransform(prog, [0, T.slip[0], T.slip[1], 1], [0, 0, 1, 1]);
  const slipY = useTransform(prog, [0, T.slip[0], T.slip[1], 1], [36, 36, 0, 0]);
  const invO = useTransform(prog, [0, T.invoiced[0], T.invoiced[1], 1], [0, 0, 1, 1]);
  // The invoice total reads "———" until the card has settled, then only its last three
  // digits roll, so it never shows a figure that looks like the job came in under.
  const start = f.invoiced - (f.invoiced % 1000 || 1000);
  const odoOn = useTransform(prog, (v): number => (v >= T.odometer[0] ? 1 : 0));
  const odo = useTransform(prog, (v) => start + (f.invoiced - start) * easeOut(Math.min(1, Math.max(0, (v - T.odometer[0]) / (T.odometer[1] - T.odometer[0])))));
  const [stamped, setStamped] = useState(() => prog.get() >= T.stamp);
  const [active, setActive] = useState(() => prog.get() >= T.copy[0] + 0.02);
  useMotionValueEvent(prog, "change", (v) => {
    const s = v >= T.stamp;
    if (s !== stamped) setStamped(s);
    const a = v >= T.copy[0] + 0.02;
    if (a !== active) setActive(a);
  });

  return (
    <>
      <motion.div style={{ opacity: slipO, y: slipY }} className={`pointer-events-none absolute ${mobile ? "right-3 top-[76px]" : "bottom-16 right-14 xl:right-20"}`}>
        <Slip preset={preset} odometer={odo} odometerOn={odoOn} stamped={stamped} compact={mobile} />
      </motion.div>

      <motion.div
        style={{ opacity: copyO, y: copyY }}
        className={`absolute inset-x-0 bottom-0 px-5 pb-24 lg:left-14 lg:right-auto lg:px-0 lg:pb-14 ${active ? "" : "pointer-events-none"}`}
      >
        <p className="mono text-[10px] text-paper/95 [text-shadow:0_1px_12px_rgba(0,0,0,0.7)] lg:text-[11px] lg:text-paper/85">
          {f.room} · {where(heroTown(preset))} · Week {f.weeks} of {f.weeks} · As built <Sample dark />
        </p>
        <h2 className="display mt-3 text-[clamp(2.4rem,10.6vw,3.4rem)] leading-[0.98] text-paper [text-shadow:0_2px_30px_rgba(0,0,0,0.35)] lg:mt-4 lg:whitespace-nowrap lg:text-[clamp(3.4rem,5.4vw,5rem)]">
          Planned <em>{money(f.price)}.</em>
          <br />
          <motion.span style={{ opacity: invO }} className="inline-block">
            Invoiced <em>{money(f.invoiced)}.</em>
          </motion.span>
        </h2>
        <CtaButtons className="mt-6 lg:mt-8" />
      </motion.div>
    </>
  );
}
