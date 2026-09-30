"use client";

import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { clamp, feetInches, pad2, r2 } from "@/lib/format";
import { pexels, type Callout, type HeroPreset } from "@/lib/site";
import type { Drawing } from "@/lib/useLinework";
import { T, laserY, roughBand, weekAt, type Geo } from "./model";

export type SceneMode = "scroll" | "static" | "calibrate";

const GRAPHITE = "#202326";
const LASER = "#e5361f";
const FIR = "#2f4b3c";
const PAPER = "#f1ece2";
const CH = 0.66; // Plex Mono advance (0.6em) + 0.06em tracking

/* ---------- Desktop label layout, shared by the callouts and the drawing title ---------- */

function deskFonts(geo: Geo, u: number) {
  const small = geo.vw < 1180;
  return { small, titleFs: (small ? 9.5 : 11) * u, specFs: (small ? 8.6 : 10) * u, numW: (small ? 19 : 22) * u };
}

/** Horizontal extent of the paper bands above and below the photo, in photo units. */
function bandExtent(geo: Geo, u: number) {
  return { xMin: (geo.hole.x - geo.px) * u + 12 * u, xMax: (geo.hole.x + geo.hole.w - geo.px) * u - 12 * u };
}

function deskLabel(c: Callout, geo: Geo, W: number, u: number) {
  const { titleFs, specFs, numW } = deskFonts(geo, u);
  const textW = Math.max((c.title.length + 4) * CH * titleFs, Math.max(c.spec.length, 17) * CH * specFs);
  const { xMin, xMax } = bandExtent(geo, u);
  const x0 = c.desk.x * W;
  let ux0 = c.desk.align === "start" ? x0 : x0 - textW;
  ux0 = Math.max(xMin, Math.min(xMax - textW, ux0)); // never past the drawing field's edges
  return { ux0, ux1: ux0 + textW, top: c.desk.side === "top", titleFs, specFs, numW };
}

/** The drawing title goes in the widest free stretch of the top band, or nowhere. */
function titlePlacement(callouts: Callout[], geo: Geo, W: number, u: number, text: string) {
  const { small } = deskFonts(geo, u);
  const fs = (small ? 9.5 : 11) * u;
  const r = (small ? 10.5 : 12) * u;
  const rule = (small ? 200 : 240) * u;
  const need = 2 * r + 8 * u + Math.max(text.length * CH * fs, rule);
  const { xMin, xMax } = bandExtent(geo, u);
  const occ = callouts
    .filter((c) => c.desk.side === "top")
    .map((c) => deskLabel(c, geo, W, u))
    .map((l) => [l.ux0 - 18 * u, l.ux1 + 18 * u] as const)
    .sort((a, b) => a[0] - b[0]);
  let best: [number, number] | null = null;
  let cur = xMin;
  for (const [a, b] of [...occ, [xMax, xMax] as const]) {
    const gap: [number, number] = [cur, Math.min(a, xMax)];
    if (gap[1] - gap[0] >= need && (!best || gap[1] - gap[0] > best[1] - best[0])) best = gap;
    cur = Math.max(cur, b);
  }
  if (!best) return null;
  return { cx: best[0] + (best[1] - best[0] - need) / 2 + r, fs, r, rule };
}

/**
 * The drawing, the rough-in, the photograph, the laser and the callouts: one SVG whose
 * viewBox is the photo's pixel size, so every layer stays registered at any viewport.
 * Only transforms, opacity and clip rects move.
 */
export function Scene({
  preset,
  geo,
  drawing,
  prog,
  mode,
  photoOverlay = 0,
  plot = true,
}: {
  preset: HeroPreset;
  geo: Geo;
  drawing?: Drawing;
  prog: MotionValue<number>;
  mode: SceneMode;
  photoOverlay?: number;
  plot?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { w: W, h: H } = preset.photo;
  const u = W / geo.pw; // viewBox units per sheet pixel
  const band = Math.round(H * 0.055);

  const b = useTransform(prog, [...T.build], [0, 1]);
  const lineY = useTransform(b, (v) => laserY(v, H));
  const laserO = useTransform(prog, [0, T.laserIn[0], T.laserIn[1], T.laserOut[0], T.laserOut[1], 1], [0, 0, 1, 1, 0, 0]);
  const pencilO = useTransform(prog, [0, T.pencilOut[0], T.pencilOut[1], 1], [1, 1, 0, 0]);

  const pencilClip = useRef<SVGRectElement>(null);
  const roughClip = useRef<SVGRectElement>(null);
  const photoClip = useRef<SVGRectElement>(null);
  const laserG = useRef<SVGGElement>(null);
  const tagG = useRef<SVGGElement>(null);
  const tagText = useRef<SVGTextElement>(null);
  const tagRect = useRef<SVGRectElement>(null);
  const [built, setBuilt] = useState<boolean[]>(() => preset.callouts.map((c) => mode === "static" || (mode === "scroll" && lineY.get() < c.at[1] * H)));

  const tagFs = (geo.mobile ? 8.6 : 10.5) * u;
  const tagH = tagFs * 1.8;
  const tagX = Math.max(geo.visX0 * W, -0.02 * W) + 14 * u;
  const big = 4 * Math.max(W, H);

  /** Tag: height above finished floor, build week, latest milestone. */
  const tagLabel = (y: number, bv: number) => {
    const aff = ((preset.floorY * H - y) / ((preset.floorY - preset.ceilingY) * H)) * preset.ceilingIn;
    const wk = weekAt(bv, preset.facts.weeks);
    const ms = [...preset.milestones].reverse().find((m) => m.week <= wk)?.label ?? "DEMO";
    return `${feetInches(Math.min(preset.ceilingIn, Math.max(0, aff)))} AFF · WEEK ${pad2(wk)} · ${ms}`;
  };
  const tagW = (txt: string) => txt.length * CH * tagFs + 26 * u;
  /**
   * Where the tag is (photo units) at hero progress p. Derived from p alone: a transform that
   * also read lineY would see last frame's laser and lag one scroll step behind.
   */
  const tagBox = (p: number) => {
    const bv = clamp((p - T.build[0]) / (T.build[1] - T.build[0]), 0, 1);
    const y = laserY(bv, H);
    const x0 = tagX + 4 * u, t0 = y + tagTop(y, u);
    return { x0, x1: x0 + tagW(tagLabel(y, bv)), t0, t1: t0 + tagH, y };
  };

  const applyDom = (y: number, bv: number) => {
    if (mode !== "scroll") return;
    const t = `translate(0 ${r2(y)})`;
    const bandNow = roughBand(bv, band);
    pencilClip.current?.setAttribute("transform", t);
    pencilClip.current?.setAttribute("height", String(r2(big - bandNow)));
    roughClip.current?.setAttribute("transform", t);
    roughClip.current?.setAttribute("y", String(r2(-bandNow)));
    roughClip.current?.setAttribute("height", String(r2(bandNow)));
    photoClip.current?.setAttribute("transform", t);
    laserG.current?.setAttribute("transform", t);
    // Near the top of the photo the tag hangs below the line, so it never enters the label band.
    tagG.current?.setAttribute("transform", `translate(${r2(tagX + 4 * u)} ${r2(tagTop(y, u))})`);
    const txt = tagLabel(y, bv);
    if (tagText.current && tagText.current.textContent !== txt) {
      tagText.current.textContent = txt;
      tagRect.current?.setAttribute("width", String(r2(tagW(txt))));
    }
  };
  useMotionValueEvent(lineY, "change", (y) => {
    applyDom(y, b.get());
    if (mode !== "scroll") return;
    const next = preset.callouts.map((c) => y < c.at[1] * H);
    setBuilt((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
  });
  // Clip rects and the laser are driven outside React; re-sync them when the scene re-renders.
  useEffect(() => {
    applyDom(lineY.get(), b.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, drawing, mode, preset]);

  const src = pexels(preset.photo.id, 2400);

  // Clip rectangles. Scroll: horizontal cut at the laser. Static (reduced motion): vertical split.
  const clips =
    mode === "static"
      ? {
          pencil: { x: -big, y: -big, width: big + W / 2, height: big * 2 },
          rough: { x: 0, y: 0, width: 0, height: 0 },
          photo: { x: W / 2, y: -big, width: big, height: big * 2 },
        }
      : mode === "calibrate"
        ? {
            pencil: { x: -big, y: -big, width: big * 2, height: big * 2 },
            rough: { x: 0, y: 0, width: 0, height: 0 },
            photo: { x: 0, y: 0, width: 0, height: 0 },
          }
        : {
            pencil: { x: -big, y: -big, width: big * 2, height: big },
            rough: { x: -big, y: 0, width: big * 2, height: 0 },
            photo: { x: -big, y: 0, width: big * 2, height: big },
          };
  const y0 = laserY(0, H);
  const initialT = mode === "scroll" ? `translate(0 ${r2(y0)})` : undefined;
  const title = `${preset.facts.room.toUpperCase()} · INTERIOR PERSPECTIVE`;
  const titleAt = !geo.mobile ? titlePlacement(preset.callouts, geo, W, u, title) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={geo.bw} height={geo.bh} overflow="visible" className="absolute left-0 top-0 block" aria-hidden>
      <defs>
        <clipPath id={`${uid}-pencil`} clipPathUnits="userSpaceOnUse">
          <rect ref={pencilClip} {...clips.pencil} transform={initialT} />
        </clipPath>
        <clipPath id={`${uid}-rough`} clipPathUnits="userSpaceOnUse">
          <rect ref={roughClip} {...clips.rough} transform={initialT} />
        </clipPath>
        <clipPath id={`${uid}-photo`} clipPathUnits="userSpaceOnUse">
          <rect ref={photoClip} {...clips.photo} transform={initialT} />
        </clipPath>
      </defs>

      {/* Photograph and rough-in, revealed from the floor up. */}
      <g clipPath={`url(#${uid}-photo)`}>
        <image href={src} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
      </g>
      {drawing?.roughinUrl ? (
        <motion.g clipPath={`url(#${uid}-rough)`} style={{ opacity: mode === "scroll" ? pencilO : 1 }}>
          <image href={drawing.roughinUrl} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
        </motion.g>
      ) : null}

      {/* Graphite: construction lines, linework, dimension string. */}
      <motion.g clipPath={`url(#${uid}-pencil)`} style={{ opacity: mode === "scroll" ? pencilO : 1 }}>
        <Pencil drawing={drawing} preset={preset} u={u} plot={plot && mode !== "calibrate"} />
      </motion.g>

      {mode === "calibrate" && photoOverlay > 0 ? <image href={src} x={0} y={0} width={W} height={H} preserveAspectRatio="none" opacity={photoOverlay} /> : null}

      {mode === "static" ? <SplitMarks W={W} H={H} u={u} mobile={geo.mobile} /> : null}

      {/* Drawing title, the way every drawing on a sheet is named (desktop, where the band has room). */}
      {titleAt ? <DrawingTitle at={titleAt} u={u} prog={prog} live={mode === "scroll"} sheet={preset.facts.sheet} text={title} /> : null}

      {/* Callouts */}
      {preset.callouts.map((c, i) => (
        <CalloutMark key={c.n + i} c={c} i={i} geo={geo} W={W} H={H} u={u} prog={prog} tagBox={tagBox} mode={mode} built={built[i] ?? false} />
      ))}

      {/* Laser level: a red line that climbs floor to ceiling, drawn over everything with its tag. */}
      {mode === "scroll" ? (
        <motion.g style={{ opacity: laserO }}>
          <g ref={laserG} transform={initialT}>
            <line x1={-0.03 * W} x2={1.03 * W} y1={0} y2={0} stroke={LASER} strokeWidth={10 * u} strokeOpacity={0.07} />
            <line x1={-0.03 * W} x2={1.03 * W} y1={0} y2={0} stroke={LASER} strokeWidth={4.5 * u} strokeOpacity={0.2} />
            <line x1={-0.03 * W} x2={1.03 * W} y1={0} y2={0} stroke={LASER} strokeWidth={1.6 * u} />
            <circle cx={tagX - 4 * u} cy={0} r={4 * u} fill={LASER} />
            <g ref={tagG} transform={`translate(${r2(tagX + 4 * u)} ${r2(tagTop(y0, u))})`}>
              <rect ref={tagRect} x={0} y={0} width={380 * u} height={tagH} fill={PAPER} fillOpacity={0.96} stroke={GRAPHITE} strokeOpacity={0.35} strokeWidth={0.8 * u} />
              <text ref={tagText} x={13 * u} y={tagFs * 1.26} className="mono" fontSize={tagFs} fill={GRAPHITE} fontWeight={500}>
                {" "}
              </text>
            </g>
          </g>
        </motion.g>
      ) : null}
    </svg>
  );
}

/** Offset of the laser tag from the line: above it, or below it once the line nears the photo's top. */
function tagTop(y: number, u: number) {
  return y - 26 * u < 8 * u ? 8 * u : -26 * u;
}

/** Reduced motion: DRAWN | BUILT, a vertical split, labelled where no callout sits. */
function SplitMarks({ W, H, u, mobile }: { W: number; H: number; u: number; mobile: boolean }) {
  const fs = (mobile ? 8.6 : 10) * u;
  const y = mobile ? H * 0.5 : H + 0.03 * H + 14 * u;
  const chipW = 7 * CH * fs + 14 * u;
  return (
    <g>
      <line x1={W / 2} y1={mobile ? 0 : -0.01 * H} x2={W / 2} y2={mobile ? H : 1.03 * H} stroke={GRAPHITE} strokeWidth={1.2 * u} />
      {mobile ? (
        <>
          <rect x={W / 2 - 8 * u - chipW} y={y - fs * 1.2} width={chipW} height={fs * 1.8} fill={PAPER} fillOpacity={0.94} />
          <rect x={W / 2 + 8 * u} y={y - fs * 1.2} width={chipW} height={fs * 1.8} fill={PAPER} fillOpacity={0.94} />
        </>
      ) : null}
      <text x={W / 2 - 15 * u} y={y} textAnchor="end" className="mono" fontSize={fs} fill={GRAPHITE} fontWeight={500}>
        ◂ DRAWN
      </text>
      <text x={W / 2 + 15 * u} y={y} className="mono" fontSize={fs} fill={GRAPHITE} fontWeight={500}>
        BUILT ▸
      </text>
    </g>
  );
}

function DrawingTitle({
  at,
  u,
  prog,
  live,
  sheet,
  text,
}: {
  at: { cx: number; fs: number; r: number; rule: number };
  u: number;
  prog: MotionValue<number>;
  live: boolean;
  sheet: string;
  text: string;
}) {
  const o = useTransform(prog, [0, T.calloutsOut[0], T.calloutsOut[1], 1], [1, 1, 0, 0]);
  const { cx: x, fs, r, rule } = at;
  const y = -34 * u;
  return (
    <motion.g style={{ opacity: live ? o : 1 }}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={GRAPHITE} strokeWidth={1 * u} />
      <line x1={x - r} x2={x + r} y1={y} y2={y} stroke={GRAPHITE} strokeWidth={0.8 * u} />
      <text x={x} y={y - 3 * u} textAnchor="middle" className="mono" fontSize={r * 0.7} fill={GRAPHITE} fontWeight={600}>
        1
      </text>
      <text x={x} y={y + r * 0.7} textAnchor="middle" className="mono" fontSize={r * 0.5} fill={GRAPHITE}>
        {sheet}
      </text>
      <text x={x + r + 8 * u} y={y - 1.5 * u} className="mono" fontSize={fs} fill={GRAPHITE} fontWeight={600}>
        {text}
      </text>
      <line x1={x + r + 8 * u} x2={x + r + 8 * u + rule} y1={y + 3 * u} y2={y + 3 * u} stroke={GRAPHITE} strokeWidth={1.4 * u} />
      <text x={x + r + 8 * u} y={y + 14 * u} className="mono" fontSize={fs * 0.82} fill={GRAPHITE} fillOpacity={0.7}>
        SCALE: NTS · EYE LEVEL 5′-4″
      </text>
    </motion.g>
  );
}

const Pencil = memo(function Pencil({ drawing, preset, u, plot }: { drawing?: Drawing; preset: HeroPreset; u: number; plot: boolean }) {
  const { w: W, h: H } = preset.photo;
  const strokes = useMemo(() => {
    if (!drawing) return [];
    const sorted = [...drawing.strokes].sort((a, b) => b.len - a.len);
    const n = sorted.length;
    return sorted.map((s, rank) => {
      const f = rank / Math.max(1, n - 1);
      const heavy = s.len > W * 0.12, mid = s.len > W * 0.04;
      return {
        d: s.d,
        w: (heavy ? 1.1 : mid ? 0.85 : 0.65) * u,
        o: heavy ? 0.9 : mid ? 0.78 : 0.62,
        delay: 0.45 + Math.pow(f, 0.85) * 1.9,
        dur: 0.28 + Math.min(1, s.len / (W * 0.45)) * 0.7,
      };
    });
  }, [drawing, W, u]);

  // Dimension string: floor to ceiling, in the left margin.
  const dx = -24 * u;
  const y0 = preset.floorY * H, y1 = preset.ceilingY * H;
  const tick = 6 * u;

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {drawing
        ? drawing.lines.map((l, i) => (
            <line
              key={`c${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={GRAPHITE}
              strokeOpacity={0.26}
              strokeWidth={0.7 * u}
              pathLength={1}
              className={plot ? "plot" : undefined}
              style={plot ? ({ "--delay": `${0.05 + i * 0.035}s`, "--dur": "0.9s" } as React.CSSProperties) : undefined}
            />
          ))
        : null}
      {strokes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          stroke={GRAPHITE}
          strokeOpacity={s.o}
          strokeWidth={s.w}
          pathLength={1}
          className={plot ? "plot" : undefined}
          style={plot ? ({ "--delay": `${s.delay.toFixed(3)}s`, "--dur": `${s.dur.toFixed(3)}s` } as React.CSSProperties) : undefined}
        />
      ))}
      {drawing ? (
        <g stroke={GRAPHITE} strokeOpacity={0.7} strokeWidth={0.9 * u}>
          <line x1={dx} y1={y0} x2={dx} y2={y1} pathLength={1} className={plot ? "plot" : undefined} style={plot ? ({ "--delay": "0.2s", "--dur": "0.8s" } as React.CSSProperties) : undefined} />
          <line x1={dx - tick} y1={y0 + tick} x2={dx + tick} y2={y0 - tick} />
          <line x1={dx - tick} y1={y1 + tick} x2={dx + tick} y2={y1 - tick} />
          <line x1={dx - 8 * u} y1={y0} x2={-4 * u} y2={y0} strokeOpacity={0.4} />
          <line x1={dx - 8 * u} y1={y1} x2={-4 * u} y2={y1} strokeOpacity={0.4} />
          <text
            x={dx - 7 * u}
            y={(y0 + y1) / 2}
            transform={`rotate(-90 ${r2(dx - 7 * u)} ${r2((y0 + y1) / 2)})`}
            textAnchor="middle"
            className="mono"
            fontSize={10 * u}
            fill={GRAPHITE}
            stroke="none"
          >
            {feetInches(preset.ceilingIn)} CLG
          </text>
        </g>
      ) : null}
    </g>
  );
});

function CalloutMark({
  c,
  i,
  geo,
  W,
  H,
  u,
  prog,
  tagBox,
  mode,
  built,
}: {
  c: Callout;
  i: number;
  geo: Geo;
  W: number;
  H: number;
  u: number;
  prog: MotionValue<number>;
  tagBox: (p: number) => { x0: number; x1: number; t0: number; t1: number; y: number };
  mode: SceneMode;
  built: boolean;
}) {
  const s = T.annotate + i * T.step;
  const draw = useTransform(prog, [0, s, s + 0.05, 1], [0, 0, 1, 1]);
  const dotS = useTransform(prog, [0, s, s + 0.012, 1], [0, 0, 1, 1]);
  const labelO = useTransform(prog, [0, s + 0.03, s + 0.06, T.calloutsOut[0], T.calloutsOut[1], 1], [0, 0, 1, 1, 0, 0]);
  const whole = useTransform(prog, [0, T.calloutsOut[0], T.calloutsOut[1], 1], [1, 1, 0, 0]);
  const live = mode === "scroll";

  const ax = c.at[0] * W, ay = c.at[1] * H;
  const m = geo.mobile;

  let path: string, lx: number, l1: number, l2: number, titleFs: number, specFs: number, numW: number;
  let underline: [number, number, number] | null = null, chip: { x: number; y: number; w: number; h: number } | null = null;

  if (!m) {
    const L = deskLabel(c, geo, W, u);
    ({ titleFs, specFs, numW } = L);
    const shoulder = L.top ? -30 * u : H + 30 * u;
    const ex = ax < L.ux0 ? L.ux0 : ax > L.ux1 ? L.ux1 : ax; // leader meets the shoulder nearest the anchor
    path = `M${r2(ax)} ${r2(ay)} L${r2(ex)} ${r2(shoulder)}`;
    underline = [L.ux0, L.ux1, shoulder];
    lx = L.ux0;
    l1 = L.top ? shoulder - 21 * u : shoulder + 16 * u;
    l2 = L.top ? shoulder - 7 * u : shoulder + 30 * u;
  } else {
    titleFs = 8.8 * u;
    specFs = 8.2 * u;
    numW = 18 * u;
    const textW = Math.max((c.title.length + 4) * CH * titleFs, Math.max(c.spec.length, 17) * CH * specFs);
    const cw = textW + 14 * u;
    const ch = 29 * u;
    let cx = c.phone.at[0] * W - (c.phone.align === "end" ? cw : 0);
    const minX = geo.visX0 * W + 8 * u, maxX = geo.visX1 * W - 8 * u - cw;
    cx = Math.min(maxX, Math.max(minX, cx));
    const cy = Math.min(H - ch - 6 * u, Math.max(6 * u, c.phone.at[1] * H - ch / 2));
    chip = { x: cx, y: cy, w: cw, h: ch };
    const ex = Math.min(cx + cw, Math.max(cx, ax));
    const ey = ay < cy ? cy : ay > cy + ch ? cy + ch : cy + ch / 2;
    const exx = ay >= cy && ay <= cy + ch ? (ax < cx ? cx : cx + cw) : ex;
    path = `M${r2(ax)} ${r2(ay)} L${r2(exx)} ${r2(ey)}`;
    lx = cx + 7 * u;
    l1 = cy + 12.5 * u;
    l2 = cy + 24 * u;
  }

  // Phone: while the laser's tag covers a chip, or the red line runs through it (which would
  // read as a strike-through), the chip steps out of the way entirely, so only one line of
  // monospace ever reads at that spot. It comes back once the laser has passed; a chip the
  // tag parks on at the ceiling stays out through the callouts' fade.
  const dim = useTransform(prog, (p) => {
    if (!chip || !live || p < T.laserIn[0]) return 1;
    const t = tagBox(p);
    const gx = Math.max(chip.x - t.x1, t.x0 - (chip.x + chip.w), 0);
    const gy = Math.max(chip.y - t.t1, t.t0 - (chip.y + chip.h), 0);
    const toLine = Math.max(chip.y - (t.y + 5 * u), t.y - 5 * u - (chip.y + chip.h), 0);
    const k = Math.min(1, Math.min(Math.max(gx, gy), toLine) / (6 * u));
    return k * k * (3 - 2 * k);
  });

  const numBox = (
    <g>
      <rect x={lx} y={l1 - titleFs * 0.92} width={numW - 5 * u} height={titleFs * 1.2} fill={GRAPHITE} />
      <text x={lx + (numW - 5 * u) / 2} y={l1} textAnchor="middle" className="mono" fontSize={titleFs * 0.86} fill={PAPER} fontWeight={500}>
        {c.n}
      </text>
    </g>
  );

  return (
    <motion.g style={{ opacity: live ? whole : 1 }}>
      <motion.g style={{ opacity: chip && live ? dim : 1 }}>
        <motion.path d={path} fill="none" stroke={GRAPHITE} strokeWidth={0.9 * u} style={live ? { pathLength: draw } : undefined} />
        <motion.circle cx={ax} cy={ay} r={3.6 * u} fill={GRAPHITE} style={live ? { scale: dotS } : undefined} />
        <motion.circle cx={ax} cy={ay} r={7 * u} fill="none" stroke={GRAPHITE} strokeOpacity={0.5} strokeWidth={0.7 * u} style={live ? { scale: dotS } : undefined} />
        <motion.g style={{ opacity: live ? labelO : 1 }}>
          {chip ? <rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} fill={PAPER} fillOpacity={0.94} stroke={GRAPHITE} strokeOpacity={0.4} strokeWidth={0.8 * u} /> : null}
          {underline ? <line x1={underline[0]} x2={underline[1]} y1={underline[2]} y2={underline[2]} stroke={GRAPHITE} strokeWidth={0.9 * u} /> : null}
          {numBox}
          <text x={lx + numW + 2 * u} y={l1} className="mono" fontSize={titleFs} fill={GRAPHITE} fontWeight={500}>
            {c.title}
          </text>
          <motion.g initial={false} animate={{ opacity: built ? 0 : 1, y: built ? -4 * u : 0 }} transition={{ duration: 0.25 }}>
            <text x={lx} y={l2} className="mono" fontSize={specFs} fill={GRAPHITE} fillOpacity={0.72}>
              {c.spec}
            </text>
          </motion.g>
          <motion.g initial={false} animate={{ opacity: built ? 1 : 0, y: built ? 0 : 5 * u }} transition={{ duration: 0.3, delay: built ? 0.08 : 0 }}>
            <text x={lx} y={l2} className="mono" fontSize={specFs} fill={FIR} fontWeight={600}>
              BUILT AS DRAWN ✓
            </text>
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.g>
  );
}
