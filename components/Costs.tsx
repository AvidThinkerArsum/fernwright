"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { kilo, money, moneyRange } from "@/lib/format";
import { briefIntent } from "@/lib/briefIntent";
import { SITE, YEAR, type CostProject } from "@/lib/site";
import { Rise, Words } from "@/components/ui/Reveal";
import { Sample } from "@/components/ui/Sample";
import { SheetStrip } from "@/components/ui/Sheet";
import { Nums } from "@/components/ui/Nums";

const SPRING = { type: "spring", stiffness: 140, damping: 22, mass: 0.9 } as const;

/** One bay of the cost axis. */
const BAY = 50000;
/** Each project gets its own axis: its top figure plus 15%, rounded up to a whole bay, so its strings fill the sheet. */
const axisMax = (p: CostProject) => Math.ceil((Math.max(...p.tiers.map((t) => t.hi)) * 1.15) / BAY) * BAY;
const MAX_ALL = Math.max(...SITE.costs.map(axisMax));
const TICKS = Array.from({ length: MAX_ALL / BAY + 1 }, (_, i) => i * BAY);

/** Drawing rows: label band above the line, the dimension line, room below. */
const ROW_H = 54;
const LINE_Y = 35;
/** 14px Plex Mono with the label's tracking and padding. */
const labelW = (s: string) => s.length * 9 + 12;

const pct = (f: number) => `${f * 100}%`;

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * One dimension string: extension lines dropping to the axis, a dimension line with slash
 * ticks, and its figure, centred above the line when the string can hold it and set beside
 * it (or above its end) when it can't. Everything moves by transform, so switching projects slides the ends.
 */
function DimString({ n, lo, hi, max, w, rowsBelow }: { n: number; lo: number; hi: number; max: number; w: number; rowsBelow: number }) {
  const a = lo / max, b = hi / max;
  const text = moneyRange(lo, hi);
  const lw = labelW(text);
  const span = (b - a) * w;
  const box = 22; // the tier number, left of the string
  // Centred above the line when the string (give or take a few px of overhang) can carry it;
  // otherwise beside its end tick; failing that, above the line and flush with its end.
  const mode = span >= lw - 12 ? "center" : b * w + 12 + lw <= w + 16 ? "right" : "end";
  const lx = mode === "center" ? ((a + b) / 2) * w - lw / 2 : mode === "right" ? b * w + 12 : Math.min(b * w + 6, w + 16) - lw;
  const ly = mode === "right" ? LINE_Y - 11 : LINE_Y - 29;
  const ext = rowsBelow * ROW_H + (ROW_H - LINE_Y) + 9;

  return (
    <div className="relative" style={{ height: ROW_H }}>
      {/* extension lines, from just above the dimension line down to the axis */}
      {[a, b].map((f, k) => (
        <motion.div key={k} aria-hidden className="absolute inset-x-0 top-0" initial={false} animate={{ x: pct(f) }} transition={SPRING}>
          <span className="absolute left-0 w-px -translate-x-1/2 bg-graphite/30" style={{ top: LINE_Y - 9, height: ext }} />
          <span className="tick text-graphite" style={{ left: 0, top: LINE_Y }} />
        </motion.div>
      ))}
      {/* the dimension line */}
      <motion.div
        aria-hidden
        className="absolute left-0 h-[1.25px] w-full origin-left bg-graphite"
        style={{ top: LINE_Y - 0.625 }}
        initial={false}
        animate={{ x: pct(a), scaleX: b - a }}
        transition={SPRING}
      />
      {/* tier number, where the string starts */}
      <motion.div aria-hidden className="absolute inset-x-0 top-0" initial={false} animate={{ x: pct(a) }} transition={SPRING}>
        <span
          className="mono absolute flex h-[17px] items-center justify-center bg-graphite text-[9.5px] font-medium tracking-[0.02em] text-paper"
          style={{ left: -(box + 8), top: LINE_Y - 8.5, width: box }}
        >
          0{n}
        </span>
      </motion.div>
      {/* the figure */}
      {w ? (
        <motion.span
          className="mono absolute left-0 top-0 whitespace-nowrap bg-paper px-1.5 text-center text-[14px] font-medium leading-[20px] tracking-[0.04em]"
          style={{ width: lw }}
          initial={false}
          animate={{ x: lx, y: ly }}
          transition={SPRING}
        >
          {text}
        </motion.span>
      ) : null}
    </div>
  );
}

/** Text that changes with the tab but never changes the row's height: every tab's version shares one grid cell. */
function Stacked({ tab, render, className = "" }: { tab: number; render: (p: CostProject) => React.ReactNode; className?: string }) {
  return (
    <div className={`grid ${className}`}>
      {SITE.costs.map((c, k) => (
        <div
          key={c.key}
          aria-hidden={k !== tab}
          className={`[grid-area:1/1] transition-[opacity,visibility] duration-300 ${k === tab ? "visible opacity-100" : "invisible opacity-0"}`}
        >
          {render(c)}
        </div>
      ))}
    </div>
  );
}

export function Costs() {
  const [tab, setTab] = useState(0);
  const project = SITE.costs[tab];
  const max = axisMax(project);
  const floor = SITE.floor / max;
  const [plot, w] = useWidth();

  return (
    <section id="costs" className="paper relative scroll-mt-16 overflow-x-clip pb-20 pt-16 lg:pb-24 lg:pt-20">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-10">
        <SheetStrip sheet="A-101" title={`Cost ranges · ${SITE.region} · ${YEAR}`} short={`Cost ranges · ${YEAR}`} scale="$50K = 1 BAY" />

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <h2 className="display text-[clamp(2.6rem,6vw,4.6rem)]">
              <Words text="Real numbers," />
              <br />
              <Words italic="before the site visit." delay={0.12} />
            </h2>
            <Rise delay={0.2} className="mt-7 max-w-[30rem] text-[16px] leading-relaxed text-graphite/80">
              <p>
                These ranges come from our own signed contracts over the last three years, design phase included. <Sample /> Pick a room and the numbers move. Budgets get set
                on a free 20-minute call, before anyone books a site visit.
              </p>
            </Rise>
            <Rise delay={0.3} className="mt-9 max-w-[30rem] border-l-2 border-fir pl-5">
              <p className="display text-[26px] leading-[1.12]">
                Planning under <span className="mono text-[0.72em] tracking-[0.02em]">{kilo(SITE.floor)}</span>? We&rsquo;re probably not your fit,{" "}
                <em>and we&rsquo;ll tell you who is.</em>
              </p>
            </Rise>
            <Rise delay={0.35} className="mt-8 text-[14px] leading-relaxed text-graphite/70">
              <p>
                Every project starts with a paid design phase,{" "}
                <span className="mono text-[12.5px] text-graphite">
                  {money(SITE.designFee.lo)}–{money(SITE.designFee.hi)}
                </span>
                , credited in full to construction. <Sample />
              </p>
            </Rise>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div role="tablist" aria-label="Project type" className="grid grid-cols-2 border-l border-t border-graphite/25 sm:grid-cols-4">
              {SITE.costs.map((c, i) => (
                <button
                  key={c.key}
                  role="tab"
                  aria-selected={tab === i}
                  onClick={() => setTab(i)}
                  className={`focus-ring relative flex min-h-[56px] items-center gap-2 border-b border-r border-graphite/25 px-3 text-left transition-colors ${
                    tab === i ? "bg-graphite text-paper" : "hover:bg-graphite/5"
                  }`}
                >
                  <span className={`mono text-[10px] ${tab === i ? "text-paper/60" : "text-graphite/45"}`}>0{i + 1}</span>
                  <span className="text-[14.5px] font-medium leading-tight">{c.label}</span>
                </button>
              ))}
            </div>

            {/* The drawing: three dimension strings over one cost axis, re-scaled per project. */}
            <figure className="mt-9" aria-label={`${project.label}: ${project.tiers.map((t) => `${t.name} ${moneyRange(t.lo, t.hi)}`).join(", ")}`}>
              <div ref={plot} className="relative mr-5 lg:mr-6">
                {/* below-the-floor hatch */}
                <motion.div
                  aria-hidden
                  className="absolute inset-x-0 top-0 bg-[repeating-linear-gradient(135deg,rgba(32,35,38,0.1)_0_1px,transparent_1px_7px)]"
                  style={{ height: ROW_H * 3 }}
                  initial={false}
                  animate={{ clipPath: `inset(0% ${(1 - floor) * 100}% 0% 0%)` }}
                  transition={SPRING}
                />
                <motion.div aria-hidden className="absolute inset-x-0 top-0" style={{ height: ROW_H * 3 }} initial={false} animate={{ x: pct(floor) }} transition={SPRING}>
                  <span className="absolute inset-y-0 left-0 border-l border-dashed border-graphite/45" />
                </motion.div>

                {project.tiers.map((t, i) => (
                  <DimString key={t.name} n={i + 1} lo={t.lo} hi={t.hi} max={max} w={w} rowsBelow={2 - i} />
                ))}

                {/* axis: one tick per $50K bay; bays past this project's top slide off the sheet */}
                <div aria-hidden className="relative h-9">
                  <span className="absolute inset-x-0 top-0 h-px bg-graphite/70" />
                  {TICKS.map((v) => (
                    <motion.div key={v} className="absolute inset-x-0 top-0" initial={false} animate={{ x: pct(v / max), opacity: v <= max ? 1 : 0 }} transition={SPRING}>
                      <span className={`absolute left-0 top-0 w-px bg-graphite/70 ${v % 100000 ? "h-1.5" : "h-2.5"}`} />
                      <span
                        className={`mono absolute top-3.5 text-[9.5px] text-graphite/60 ${v === 0 ? "left-0" : "left-0 -translate-x-1/2"} ${
                          v % 100000 && v !== max ? "hidden sm:block" : ""
                        }`}
                      >
                        {v === 0 ? "$0" : kilo(v)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <figcaption className="mono mt-1 text-[9.5px] text-graphite/55">
                <span className="mr-2 inline-block h-2.5 w-4 translate-y-[1px] border border-dashed border-graphite/40 bg-[repeating-linear-gradient(135deg,rgba(32,35,38,0.18)_0_1px,transparent_1px_4px)]" />
                Below {kilo(SITE.floor)}: we&rsquo;ll refer you to someone good
              </figcaption>
            </figure>

            {/* What each band buys. Every tab's copy shares one cell, so nothing below it jumps. */}
            <ol className="mt-8 border-t border-graphite/30">
              {project.tiers.map((t, i) => (
                <li key={t.name} className="grid gap-x-6 gap-y-1.5 border-b border-graphite/15 py-4 sm:grid-cols-[11.5rem_minmax(0,1fr)]">
                  <p className="display flex items-center gap-2.5 text-[26px] leading-none">
                    <span className="mono inline-flex h-[17px] w-[22px] items-center justify-center bg-graphite text-[9.5px] font-medium tracking-[0.02em] text-paper">0{i + 1}</span>
                    {t.name}
                  </p>
                  <div>
                    <Stacked
                      tab={tab}
                      render={(c) => (
                        <p className="mono text-[11px] text-graphite/75">
                          <span className="font-medium text-graphite">{moneyRange(c.tiers[i].lo, c.tiers[i].hi)}</span> · {c.tiers[i].weeks} wks <Sample />
                        </p>
                      )}
                    />
                    <Stacked
                      tab={tab}
                      className="mt-1"
                      render={(c) => (
                        <p className="text-[14px] leading-snug text-graphite/72">
                          <Nums>{c.tiers[i].what}</Nums>
                        </p>
                      )}
                    />
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#brief"
                onClick={() => briefIntent.start(project.key)}
                className="focus-ring inline-flex h-12 items-center gap-2 rounded-[3px] bg-graphite px-5 text-[14px] font-medium text-paper transition-colors hover:bg-graphite-2"
              >
                Start a brief with your band <span aria-hidden>→</span>
              </a>
              <p className="max-w-[22rem] text-[13px] leading-snug text-graphite/60">
                Opens on <span className="text-graphite">{project.label}</span> with these three ranges as the budget question.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
