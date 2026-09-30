"use client";

import { useReduced } from "@/lib/useReduced";
import { motion, useMotionValue, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { money, variance } from "@/lib/format";
import { SITE, heroTown, where, type HeroPreset } from "@/lib/site";
import { useLinework } from "@/lib/useLinework";
import { Sample } from "@/components/ui/Sample";
import { AsBuilt, AsBuiltScrim, CtaButtons, Slip } from "./AsBuilt";
import { Calibrate, useCalibrateFlags } from "./Calibrate";
import { T, computeGeo, type Geo } from "./model";
import { Scene, type SceneMode } from "./Scene";
import { DeskTitleBlock, PhoneHeadline, PhoneStrip } from "./TitleBlock";

export const NAV_H = SITE.showConceptBanner ? 78 : 52;

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0, y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** The sheet with its drawing window cut out, so the stage underneath shows through. */
function holeClip(geo: Geo) {
  const { x, y, w, h } = geo.hole;
  const t = geo.mobile ? 1 : 0; // keep the phone window's hairline borders on the paper
  const x0 = x, x1 = x + w, y0 = y + t, y1 = y + h - t;
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x0}px ${y0}px, ${x1}px ${y0}px, ${x1}px ${y1}px, ${x0}px ${y1}px, ${x0}px ${y0}px)`;
}

export function Hero() {
  const reduce = useReduced();
  const flags = useCalibrateFlags();
  // Calibrate can override the preset; `?preset=` picks a starting one (dev only).
  const [override, setPreset] = useState<HeroPreset | null>(null);
  const preset = override ?? flags.preset ?? SITE.hero;
  const [photoOverlay, setPhotoOverlay] = useState(0);

  const mode: SceneMode = flags.calibrate ? "calibrate" : reduce ? "static" : "scroll";
  const pinned = mode === "scroll";

  const section = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const holeDesk = useRef<HTMLDivElement>(null);
  const holePhone = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  const measure = useCallback(() => {
    const f = frame.current;
    if (!f) return;
    const mobile = f.offsetWidth < 1024;
    const h = mobile ? holePhone.current : holeDesk.current;
    if (!h) return;
    setGeo(computeGeo({ w: f.offsetWidth, h: f.offsetHeight }, offsetWithin(h, f), preset, mobile));
  }, [preset]);
  useIsoLayout(() => {
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of [frame.current, holeDesk.current, holePhone.current, holePhone.current?.previousElementSibling]) if (el) ro.observe(el as Element);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, mode]);

  // Calibrate overrides are settings nobody precomputed; go straight to the engine.
  const { drawing, error } = useLinework(preset.photo, preset.engine, { roughin: true, precomputed: !override });

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const fixed = useMotionValue(mode === "calibrate" ? 0.3 : 1);
  useEffect(() => fixed.set(mode === "calibrate" ? 0.3 : 1), [mode, fixed]);
  const prog: MotionValue<number> = pinned ? scrollYProgress : fixed;

  // As-built: the photo zooms to full bleed under the sheet, then the sheet falls away.
  const bleed = useTransform(prog, (v) => (pinned ? ease(clamp01((v - T.bleed[0]) / (T.bleed[1] - T.bleed[0])), 0.65) : 0));
  const fall = useTransform(prog, (v) => (pinned ? Math.pow(clamp01((v - T.fall[0]) / (T.fall[1] - T.fall[0])), 1.7) : 0));
  const paperY = useTransform(fall, (e) => `${e * 112}%`);
  const paperR = useTransform(fall, (e) => e * 5);
  const paperO = useTransform(fall, [0, 0.85, 1], [1, 1, 0]);
  // A soft shadow under the sheet's leading edge while it falls, so it reads as paper lifting off the photo.
  const shadowO = useTransform(fall, [0, 0.03, 1], [0, 1, 1]);
  const cueO = useTransform(prog, [0, T.cue, 1], [1, 0, 0]);
  const paperMotion = pinned ? { y: paperY, rotate: paperR, opacity: paperO, transformOrigin: "12% 100%" } : undefined;

  const stageX = useTransform(bleed, (e) => (geo ? geo.sx * (1 - e) : 0));
  const stageY = useTransform(bleed, (e) => (geo ? geo.sy * (1 - e) : 0));
  const stageS = useTransform(bleed, (e) => (geo ? geo.k + (1 - geo.k) * e : 1));

  const f = preset.facts;
  const mobile = geo?.mobile ?? false;

  return (
    <section
      id="top"
      ref={section}
      className={`relative ${pinned ? "h-[380vh] lg:h-[500vh]" : ""}`}
      aria-label={`${SITE.name}: we draw it, then we build exactly that`}
    >
      {/* The frame is paper too, so nothing behind the sheet ever reads as a hole. */}
      <div ref={frame} className={`paper ${pinned ? "sticky top-0 h-[100svh]" : "relative h-[100svh] min-h-[640px]"} overflow-hidden`}>
        {/* The stage: drawing → rough-in → photograph, all one registered SVG, under the sheet. */}
        {geo ? (
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              className="absolute origin-top-left"
              style={{
                left: geo.bx,
                top: geo.by,
                width: geo.bw,
                height: geo.bh,
                x: pinned ? stageX : geo.sx,
                y: pinned ? stageY : geo.sy,
                scale: pinned ? stageS : geo.k,
              }}
            >
              <Scene preset={preset} geo={geo} drawing={drawing} prog={prog} mode={mode} photoOverlay={photoOverlay} />
            </motion.div>
          </div>
        ) : null}

        {/* The as-built wash sits under the sheet, so the falling paper keeps its own colour. */}
        {pinned ? <AsBuiltScrim prog={prog} /> : null}

        {/* The sheet of paper: border, title block, headline, with the drawing window cut out. Renders with the first paint. */}
        <motion.div style={paperMotion} className="absolute inset-0 will-change-transform">
          {pinned ? (
            <motion.div
              aria-hidden
              style={{ opacity: shadowO }}
              className="pointer-events-none absolute inset-0 shadow-[0_-16px_44px_rgba(0,0,0,0.34),0_-1px_4px_rgba(0,0,0,0.22)]"
            />
          ) : null}
          <div style={{ clipPath: geo ? holeClip(geo) : undefined }} className="paper absolute inset-0">
            <div
              className="absolute inset-x-2 bottom-2 top-[calc(var(--nav)+6px)] lg:inset-x-3.5 lg:bottom-3.5 lg:top-[calc(var(--nav)+12px)]"
              style={{ "--nav": `${NAV_H}px` } as React.CSSProperties}
            >
              <div className="absolute inset-0 border-[1.5px] border-graphite/80" />
              <div className="absolute inset-[4px] border border-graphite/35 lg:inset-[5px]">
                {/* Desktop: drawing field + vertical title block */}
                <div className="hidden h-full grid-cols-[minmax(0,1fr)_clamp(340px,27vw,420px)] lg:grid">
                  <div ref={holeDesk} className="relative h-full" />
                  <aside className="h-full border-l border-graphite/35">
                    <DeskTitleBlock preset={preset} prog={prog} live={pinned} />
                  </aside>
                </div>
                {/* Phone / tablet: headline, drawing window, title strip */}
                <div className="flex h-full flex-col lg:hidden">
                  <PhoneHeadline preset={preset} />
                  <div ref={holePhone} className="relative h-[min(44svh,350px)] shrink-0 border-y border-graphite/35 md:h-[48svh]" />
                  <div className="min-h-0 flex-1">
                    <PhoneStrip preset={preset} prog={prog} live={pinned} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Grid references along the drawing field's edges: printed on the sheet, so they fall with it. */}
        {geo && !geo.mobile ? (
          <motion.div style={paperMotion} className="pointer-events-none absolute inset-0">
            <GridRefs hole={geo.hole} />
          </motion.div>
        ) : null}

        {/* Plotting indicator, only if the drawing is still being traced. */}
        {geo && !drawing ? (
          <div className="pointer-events-none absolute flex items-center justify-center" style={{ left: geo.hole.x, top: geo.hole.y, width: geo.hole.w, height: geo.hole.h }}>
            <p className="mono animate-pulse text-[10px] text-graphite/60">{error ? "Drawing unavailable offline" : `Plotting sheet ${f.sheet}…`}</p>
          </div>
        ) : null}

        {pinned && geo ? (
          <motion.div
            // Desktop: in the label band under the drawing. Phone: at the top of the window, over the ceiling, clear of the island.
            style={{ opacity: cueO, left: geo.hole.x, width: geo.hole.w, top: geo.mobile ? geo.hole.y + 8 : geo.hole.y + geo.hole.h - 34 }}
            className="pointer-events-none absolute flex justify-center"
          >
            <span className="mono flex items-center gap-2 bg-paper/80 px-2 py-1 text-[10px] text-graphite/70">
              Scroll to build it <span aria-hidden className="animate-bounce">↓</span>
            </span>
          </motion.div>
        ) : null}

        {pinned ? <AsBuilt preset={preset} prog={prog} mobile={mobile} /> : null}

        {mode === "calibrate" && geo ? (
          <Calibrate key={preset.photo.id} preset={preset} setPreset={setPreset} geo={geo} frame={frame} photoOverlay={photoOverlay} setPhotoOverlay={setPhotoOverlay} drawingMs={drawing?.ms} />
        ) : null}
      </div>

      {/* Reduced motion: no pin. Every number filled in, stamp already down. */}
      {mode === "static" ? (
        <div className="paper border-b border-graphite/20 px-5 py-12 lg:px-14 lg:py-16">
          <div className="mx-auto grid max-w-[1200px] items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="mono text-[10px] text-graphite/60">
                {f.room} · {where(heroTown(preset))} · Week {f.weeks} of {f.weeks} · As built <Sample />
              </p>
              <h2 className="display mt-3 text-[clamp(2.4rem,7vw,4.6rem)]">
                Planned <em>{money(f.price)}.</em>
                <br />
                Invoiced <em>{money(f.invoiced)}.</em>
              </h2>
              <p className="mono mt-4 text-[12px]">
                Fixed price {money(f.price)} · {f.weeks}&nbsp;weeks · Variance&nbsp;{variance(f.invoiced - f.price)}
              </p>
              <CtaButtons dark={false} className="mt-6" />
            </div>
            <div className="pt-2 lg:pb-2">
              <Slip preset={preset} stamped />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Smoothstep-ish ease with adjustable bias. */
function ease(t: number, k = 0.5) {
  const s = t * t * (3 - 2 * t);
  return s * k + t * (1 - k);
}

/** Letters and numbers along the sheet edge, like a real drawing set's grid references. */
function GridRefs({ hole }: { hole: Geo["hole"] }) {
  const cols = ["1", "2", "3", "4", "5", "6"];
  const rows = ["A", "B", "C", "D"];
  return (
    <div aria-hidden className="absolute" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}>
      {cols.map((c, i) => (
        <span key={c} className="mono absolute top-1.5 -translate-x-1/2 text-[8.5px] text-graphite/40" style={{ left: `${((i + 0.5) / cols.length) * 100}%` }}>
          {c}
        </span>
      ))}
      {rows.map((r, i) => (
        <span key={r} className="mono absolute left-2 -translate-y-1/2 text-[8.5px] text-graphite/40" style={{ top: `${((i + 0.5) / rows.length) * 100}%` }}>
          {r}
        </span>
      ))}
      {cols.slice(1).map((c, i) => (
        <span key={`t${c}`} className="absolute top-0 h-2 w-px bg-graphite/35" style={{ left: `${((i + 1) / cols.length) * 100}%` }} />
      ))}
      {rows.slice(1).map((r, i) => (
        <span key={`l${r}`} className="absolute left-0 h-px w-2 bg-graphite/35" style={{ top: `${((i + 1) / rows.length) * 100}%` }} />
      ))}
    </div>
  );
}
