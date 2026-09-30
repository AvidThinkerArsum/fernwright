"use client";

import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { useState } from "react";
import { money } from "@/lib/format";
import { SITE, heroTown, where, type HeroPreset } from "@/lib/site";
import { Sample, registration, since } from "@/components/ui/Sample";
import { T } from "./model";

/** Types `text` in as progress crosses `range`. Static modes show it complete. */
export function Typed({ prog, range, text, live, className = "" }: { prog: MotionValue<number>; range: readonly [number, number]; text: string; live: boolean; className?: string }) {
  const count = (v: number) => Math.round(Math.min(1, Math.max(0, (v - range[0]) / (range[1] - range[0]))) * text.length);
  const [n, setN] = useState(() => (live ? count(prog.get()) : text.length));
  useMotionValueEvent(prog, "change", (v) => {
    if (!live) return;
    const c = count(v);
    if (c !== n) setN(c);
  });
  const shown = live ? n : text.length;
  if (live && shown === 0)
    return (
      <span className={`opacity-30 ${className}`} aria-label="Not yet priced">
        ——— ——— ———
      </span>
    );
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, shown)}</span>
      {live && shown < text.length ? <span aria-hidden className="caret ml-px inline-block h-[1em] w-[0.55em] translate-y-[0.14em] bg-graphite/80" /> : null}
    </span>
  );
}

export function usePhase(prog: MotionValue<number>, live: boolean) {
  const at = (v: number) => (v >= T.stamp ? 3 : v >= T.build[1] ? 2 : v >= T.type[1] ? 1 : 0);
  const [phase, setPhase] = useState(() => (live ? at(prog.get()) : 3));
  useMotionValueEvent(prog, "change", (v) => {
    if (!live) return;
    const p = at(v);
    if (p !== phase) setPhase(p);
  });
  return live ? phase : 3;
}

export function Mark({ className = "" }: { className?: string }) {
  // A fern frond drawn like a section cut: a stem and alternating pinnae.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="1" y="1" width="30" height="30" strokeWidth="1.2" />
      <path d="M16 27 C16 20 16.4 12 18.5 5" />
      <path d="M16.1 22 l-5.5 -2.4 M16.2 17.5 l-5 -3 M16.6 13 l-4.2 -3.2 M17.3 9 l-3.2 -2.8" />
      <path d="M16.1 20 l5 -2.8 M16.3 15.4 l4.6 -3 M16.9 11 l3.7 -3" />
    </svg>
  );
}

const cell = "border-graphite/25";

export function DeskTitleBlock({ preset, prog, live }: { preset: HeroPreset; prog: MotionValue<number>; live: boolean }) {
  const phase = usePhase(prog, live);
  const f = preset.facts;
  const contract = `FIXED PRICE ${money(f.price)} · ${f.weeks} WEEKS`;
  const revs = [
    { r: "A", what: "Drawn", note: `Sheet ${f.sheet}`, on: true },
    { r: "B", what: "Priced", note: `${money(f.price)} fixed`, on: phase >= 1 },
    { r: "C", what: "Built as drawn", note: `Week ${f.weeks}`, on: phase >= 2 },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 border-b px-5 py-3.5 ${cell}`}>
        <Mark className="h-8 w-8 shrink-0 text-graphite" />
        <div className="leading-tight">
          <p className="mono text-[11px] font-medium tracking-[0.14em]">{SITE.name}</p>
          <p className="mono mt-0.5 text-[9.5px] text-graphite/60">
            {where()}
            {since() ? ` · ${since()}` : ""}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-5 xl:px-7">
        <p className="mono text-[10px] text-graphite/60">Design-build remodeling · {SITE.region}</p>
        <h1 className="display mt-4 whitespace-nowrap text-[clamp(2.4rem,min(5.9vh,3.55vw),3.4rem)] leading-[0.95]">
          We draw it.
          <br />
          Then we build
          <br />
          <em>exactly that.</em>
        </h1>
        <p className="mt-5 max-w-[20rem] text-[14px] leading-relaxed text-graphite/75">
          One team designs, prices and builds your remodel. At the end you hold the drawing and the invoice, and they match.
        </p>
      </div>

      <div className={`border-t px-6 py-3.5 xl:px-7 ${cell}`}>
        <p className="mono text-[9.5px] text-graphite/55">
          Contract <Sample />
        </p>
        <p className="mono mt-1.5 min-h-[1.3em] text-[13px] font-medium tracking-[0.05em]">
          <Typed prog={prog} range={T.type} text={contract} live={live} />
        </p>
      </div>

      <div className={`border-t [@media(max-height:760px)]:hidden ${cell}`}>
        <div className={`mono grid grid-cols-[2.2rem_1fr_auto] items-center border-b text-[8.5px] text-graphite/50 ${cell}`}>
          <span className={`border-r py-1 text-center ${cell}`}>Rev</span>
          <span className="px-3 py-1">Description</span>
          <span className="px-3 py-1">
            Record
            <Sample />
          </span>
        </div>
        {revs.map((r) => (
          <div key={r.r} className={`mono grid grid-cols-[2.2rem_1fr_auto] items-center border-b text-[10px] last:border-b-0 ${cell}`}>
            <span className={`border-r py-1.5 text-center ${cell}`}>{r.r}</span>
            <span className={`px-3 py-1.5 transition-opacity duration-500 ${r.on ? "opacity-100" : "opacity-25"}`}>{r.what}</span>
            <span className={`px-3 py-1.5 transition-opacity duration-500 ${r.on ? "text-fir opacity-100" : "opacity-25"}`}>
              {r.note} {r.on ? "✓" : ""}
            </span>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-[1fr_auto] border-t ${cell}`}>
        <div className={`border-r px-6 py-3 xl:px-7 ${cell}`}>
          <p className="mono text-[9.5px] text-graphite/55">Project</p>
          <p className="mono mt-1 text-[11.5px] font-medium">
            {f.room} · <span className="whitespace-nowrap">{where(heroTown(preset))}</span>
          </p>
          <p className="mono mt-2.5 text-[9.5px] text-graphite/55">Scale</p>
          <p className="mono mt-1 text-[11px]">As noted</p>
        </div>
        <div className="flex flex-col justify-center px-5 py-3">
          <p className="mono text-[9.5px] text-graphite/55">Sheet</p>
          <p className="mono mt-0.5 text-[30px] font-medium leading-none tracking-[0.02em]">{f.sheet}</p>
        </div>
      </div>

      <div className={`border-t px-6 py-3 xl:px-7 ${cell}`}>
        <p className="mono text-[9.5px] text-graphite/55">{SITE.licenseLabel}</p>
        <p className="mono mt-1 text-[12px] font-medium tracking-[0.1em]">{registration()}</p>
      </div>
    </div>
  );
}

export function PhoneHeadline({ preset }: { preset: HeroPreset }) {
  return (
    <div className="px-4 pb-3 pt-4">
      <p className="mono text-[9.5px] text-graphite/60">
        Sheet {preset.facts.sheet} · {preset.facts.room} · {where(heroTown(preset))}
      </p>
      <h1 className="display mt-2.5 text-[clamp(2.25rem,10.4vw,3.4rem)] leading-[0.95]">
        We draw it.
        <br />
        Then we build <em>exactly that.</em>
      </h1>
    </div>
  );
}

export function PhoneStrip({ preset, prog, live }: { preset: HeroPreset; prog: MotionValue<number>; live: boolean }) {
  const f = preset.facts;
  const contract = `FIXED PRICE ${money(f.price)} · ${f.weeks} WEEKS`;
  return (
    <div className="flex h-full flex-col text-graphite">
      <div className={`border-b px-4 py-2.5 ${cell}`}>
        <p className="mono text-[9px] text-graphite/55">
          Contract <Sample />
        </p>
        <p className="mono mt-1 min-h-[1.3em] text-[12px] font-medium">
          <Typed prog={prog} range={T.type} text={contract} live={live} />
        </p>
      </div>
      <div className={`grid grid-cols-[1fr_auto] border-b ${cell}`}>
        <div className={`border-r px-4 py-2 ${cell}`}>
          <p className="mono text-[9px] text-graphite/55">{SITE.name}</p>
          <p className="mono mt-1 text-[10.5px] font-medium">
            {f.room} · {where(heroTown(preset))}
          </p>
        </div>
        <div className="px-4 py-2">
          <p className="mono text-[9px] text-graphite/55">Sheet</p>
          <p className="mono text-[20px] font-medium leading-tight">{f.sheet}</p>
        </div>
      </div>
      <div className={`border-b px-4 py-2 ${cell}`}>
        <p className="mono text-[9px] text-graphite/55">{SITE.licenseLabel}</p>
        <p className="mono mt-0.5 text-[11px] font-medium tracking-[0.1em]">{registration()}</p>
      </div>
      <p className="px-4 py-3 text-[13px] leading-snug text-graphite/75">
        One team designs, prices and builds your remodel. At the end, the drawing and the invoice match.
      </p>
    </div>
  );
}
