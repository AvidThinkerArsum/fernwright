import { clamp } from "@/lib/format";
import type { HeroPreset } from "@/lib/site";

/** Scroll timeline of the pinned hero, as fractions of the section's scroll. */
export const T = {
  cue: 0.05,
  annotate: 0.06, // callout i draws from annotate + i*step
  step: 0.045,
  type: [0.19, 0.29] as const,
  laserIn: [0.3, 0.33] as const,
  build: [0.33, 0.72] as const,
  laserOut: [0.72, 0.75] as const,
  pencilOut: [0.71, 0.745] as const,
  calloutsOut: [0.73, 0.765] as const,
  // The photo zooms to full bleed under the sheet first; only then does the sheet fall
  // away, so what it uncovers is already photograph.
  bleed: [0.745, 0.815] as const,
  fall: [0.785, 0.87] as const,
  // Nothing of the as-built beat appears until the sheet is off the screen, so no copy
  // ever sits on falling paper. The record card leads the headline by a hair.
  slip: [0.875, 0.905] as const,
  copy: [0.88, 0.92] as const,
  odometer: [0.9, 0.95] as const,
  invoiced: [0.945, 0.962] as const,
  stamp: 0.958,
};

export type Geo = {
  vw: number;
  vh: number;
  mobile: boolean;
  /** Stage laid out at full-bleed (cover) size and position. */
  bw: number;
  bh: number;
  bx: number;
  by: number;
  /** Sheet state: stage translation and scale relative to the full-bleed box. */
  sx: number;
  sy: number;
  k: number;
  /** Photo rectangle on the sheet, in frame pixels. */
  px: number;
  py: number;
  pw: number;
  ph: number;
  /** The drawing window (hole) on the sheet, in frame pixels. */
  hole: { x: number; y: number; w: number; h: number };
  /** Visible part of the photo on the sheet, as fractions of its width. */
  visX0: number;
  visX1: number;
};

/** Desktop: reserve paper above and below the photo for callout labels. */
export const LABEL_BAND = 86;
export const SIDE_PAD = 40;

export function computeGeo(
  frame: { w: number; h: number },
  hole: { x: number; y: number; w: number; h: number },
  preset: HeroPreset,
  mobile: boolean,
): Geo {
  const { w: W, h: H } = preset.photo;
  const a = W / H;
  const vw = frame.w, vh = frame.h;

  // Full-bleed: cover the frame (plus the preset's zoom), centred on the focus point.
  const bw = Math.max(vw, vh * a) * (preset.bleedZoom ?? 1);
  const bh = bw / a;
  const [fx, fy] = preset.focus;
  const bx = clamp(vw / 2 - fx * bw, vw - bw, 0);
  const by = clamp(vh / 2 - fy * bh, vh - bh, 0);

  let pw: number, ph: number, px: number, py: number;
  if (!mobile) {
    const aw = hole.w - SIDE_PAD * 2;
    const ah = hole.h - LABEL_BAND * 2;
    pw = Math.min(aw, ah * a);
    ph = pw / a;
    px = hole.x + (hole.w - pw) / 2;
    py = hole.y + (hole.h - ph) / 2;
  } else {
    ph = hole.h;
    pw = ph * a;
    if (pw < hole.w) {
      pw = hole.w;
      ph = pw / a;
    }
    px = clamp(hole.x + hole.w / 2 - preset.phoneFocus * pw, hole.x + hole.w - pw, hole.x);
    py = hole.y + (hole.h - ph) / 2;
  }
  const k = pw / bw;
  const visX0 = clamp((hole.x - px) / pw, 0, 1);
  const visX1 = clamp((hole.x + hole.w - px) / pw, 0, 1);
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    vw,
    vh,
    mobile,
    bw: r(bw),
    bh: r(bh),
    bx: r(bx),
    by: r(by),
    sx: r(px - bx),
    sy: r(py - by),
    k,
    px: r(px),
    py: r(py),
    pw: r(pw),
    ph: r(ph),
    hole,
    visX0,
    visX1,
  };
}

/**
 * Laser height in photo units: build progress 0→1 climbs from the bottom edge of the photo
 * to its top. It never leaves the photo, so its tag never reaches the label bands, and no
 * photograph shows below it before the build starts.
 */
export function laserY(b: number, H: number) {
  return H * (1 - clamp(b, 0, 1));
}

/** Height of the plywood rough-in band above the laser: it opens over the first stretch of the climb. */
export function roughBand(b: number, band: number) {
  return band * clamp(b / 0.06, 0, 1);
}

export function weekAt(b: number, weeks: number) {
  return clamp(1 + Math.floor((weeks - 1) * Math.pow(clamp(b, 0, 1), 1.35) + 0.0001), 1, weeks);
}
