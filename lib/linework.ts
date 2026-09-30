/**
 * The one-photo engine. Pure functions, run inside a Web Worker:
 *   blur → Sobel → non-maximum suppression → hysteresis (with optional boost / exclude
 *   regions) → speck removal → thinning → stroke tracing (Douglas–Peucker) → H/V
 *   snapping with squared corners → can and texture filters → parallel-edge merge
 *   for the graphite linework,
 *   → Hough transform for long construction lines,
 *   → a plywood-toned "rough-in" bitmap.
 * All output coordinates are in the photo's own pixel space (the SVG viewBox).
 */
import type { EngineParams } from "./site";

export type Stroke = { d: string; len: number; x: number; y: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number; len: number };

export type LineworkInput = {
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
  /** Size of the coordinate space to emit (the photo's pixel size / SVG viewBox). */
  outW: number;
  outH: number;
  params: EngineParams;
  roughin: boolean;
  /** Skip tracing and Hough (only the rough-in bitmap is wanted). */
  skipVectors?: boolean;
  /** Also return the strokes the filters dropped (engine tests only). */
  debug?: boolean;
};

export type LineworkOutput = {
  w: number;
  h: number;
  outW: number;
  outH: number;
  strokes: Stroke[];
  lines: Segment[];
  edgeCount: number;
  roughin?: Uint8ClampedArray;
  dropped?: Stroke[];
  ms: number;
};

function luminance(rgba: Uint8ClampedArray, w: number, h: number) {
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) {
    g[i] = (0.2126 * rgba[j] + 0.7152 * rgba[j + 1] + 0.0722 * rgba[j + 2]) / 255;
  }
  return g;
}

function gaussian(src: Float32Array, w: number, h: number, sigma: number) {
  if (sigma < 0.2) return src.slice();
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(r * 2 + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + r] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i;
        acc += src[row + xx] * k[i + r];
      }
      tmp[row + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i;
        acc += tmp[yy * w + x] * k[i + r];
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

/** Sobel + non-maximum suppression. Returns thinned gradient magnitude. */
function sobelNms(src: Float32Array, w: number, h: number) {
  const mag = new Float32Array(w * h);
  const dir = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = src[i - w - 1], b = src[i - w], c = src[i - w + 1];
      const d = src[i - 1], f = src[i + 1];
      const g = src[i + w - 1], hh = src[i + w], k = src[i + w + 1];
      const gx = c + 2 * f + k - a - 2 * d - g;
      const gy = g + 2 * hh + k - a - 2 * b - c;
      mag[i] = Math.sqrt(gx * gx + gy * gy);
      let ang = (Math.atan2(gy, gx) * 180) / Math.PI;
      if (ang < 0) ang += 180;
      dir[i] = ang < 22.5 || ang >= 157.5 ? 0 : ang < 67.5 ? 1 : ang < 112.5 ? 2 : 3;
    }
  }
  const nms = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const m = mag[i];
      if (m === 0) continue;
      let p: number, q: number;
      switch (dir[i]) {
        case 0: p = mag[i - 1]; q = mag[i + 1]; break;
        case 1: p = mag[i - w - 1]; q = mag[i + w + 1]; break;
        case 2: p = mag[i - w]; q = mag[i + w]; break;
        default: p = mag[i - w + 1]; q = mag[i + w - 1];
      }
      if (m >= p && m > q) nms[i] = m;
    }
  }
  return nms;
}

/** Percentile-based hysteresis so the same settings work across photos. */
function hysteresis(nms: Float32Array, w: number, h: number, density: number, lowRatio: number, gain?: Float32Array) {
  let max = 0;
  for (let i = 0; i < nms.length; i++) if (nms[i] > max) max = nms[i];
  const bins = 2048;
  const hist = new Uint32Array(bins);
  const floor = max * 0.02;
  let n = 0;
  for (let i = 0; i < nms.length; i++) {
    const v = nms[i];
    if (v > floor) {
      hist[Math.min(bins - 1, Math.floor((v / max) * bins))]++;
      n++;
    }
  }
  const want = n * density;
  let acc = 0;
  let hb = bins - 1;
  for (; hb > 0; hb--) {
    acc += hist[hb];
    if (acc >= want) break;
  }
  // Thresholds come from the whole photo; boost regions only lift their own faint edges.
  const high = (hb / bins) * max;
  const low = high * lowRatio;
  const val = gain ? (i: number) => nms[i] * gain[i] : (i: number) => nms[i];
  const edge = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  for (let i = 0; i < nms.length; i++) {
    if (val(i) >= high && !edge[i]) {
      edge[i] = 1;
      stack[sp++] = i;
      while (sp) {
        const j = stack[--sp];
        const x = j % w;
        const y = (j - x) / w;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w || (dx === 0 && dy === 0)) continue;
            const k = yy * w + xx;
            if (!edge[k] && val(k) >= low) {
              edge[k] = 1;
              stack[sp++] = k;
            }
          }
        }
      }
    }
  }
  return edge;
}

type Rect = [number, number, number, number];
function rectPx(r: Rect, w: number, h: number) {
  const x0 = Math.max(0, Math.floor(Math.min(r[0], r[2]) * w)), x1 = Math.min(w, Math.ceil(Math.max(r[0], r[2]) * w));
  const y0 = Math.max(0, Math.floor(Math.min(r[1], r[3]) * h)), y1 = Math.min(h, Math.ceil(Math.max(r[1], r[3]) * h));
  return { x0, x1, y0, y1 };
}

function gainMap(w: number, h: number, boost: { r: Rect; k: number }[]) {
  const g = new Float32Array(w * h).fill(1);
  for (const b of boost) {
    const { x0, x1, y0, y1 } = rectPx(b.r, w, h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g[y * w + x] = Math.max(g[y * w + x], b.k);
  }
  return g;
}

function excludeRegions(edge: Uint8Array, w: number, h: number, rects: Rect[]) {
  for (const r of rects) {
    const { x0, x1, y0, y1 } = rectPx(r, w, h);
    for (let y = y0; y < y1; y++) edge.fill(0, y * w + x0, y * w + x1);
  }
}

/** Remove 8-connected groups smaller than `min` pixels. */
function despeck(edge: Uint8Array, w: number, h: number, min: number) {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const members: number[] = [];
  for (let i = 0; i < edge.length; i++) {
    if (!edge[i] || seen[i]) continue;
    members.length = 0;
    let sp = 0;
    stack[sp++] = i;
    seen[i] = 1;
    while (sp) {
      const j = stack[--sp];
      members.push(j);
      const x = j % w;
      const y = (j - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const k = yy * w + xx;
          if (edge[k] && !seen[k]) {
            seen[k] = 1;
            stack[sp++] = k;
          }
        }
      }
    }
    if (members.length < min) for (const j of members) edge[j] = 0;
  }
}

/** Zhang–Suen thinning so strokes trace as single-pixel chains. */
function thin(edge: Uint8Array, w: number, h: number) {
  const del: number[] = [];
  for (let iter = 0; iter < 12; iter++) {
    let changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!edge[i]) continue;
          const p2 = edge[i - w], p3 = edge[i - w + 1], p4 = edge[i + 1], p5 = edge[i + w + 1];
          const p6 = edge[i + w], p7 = edge[i + w - 1], p8 = edge[i - 1], p9 = edge[i - w - 1];
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const a =
            (+(!p2 && p3) as number) + (+(!p3 && p4) as number) + (+(!p4 && p5) as number) + (+(!p5 && p6) as number) +
            (+(!p6 && p7) as number) + (+(!p7 && p8) as number) + (+(!p8 && p9) as number) + (+(!p9 && p2) as number);
          if (a !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0 : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) del.push(i);
        }
      }
      if (del.length) changed = true;
      for (const i of del) edge[i] = 0;
    }
    if (!changed) break;
  }
}

const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];

/** Trace 8-connected chains, preferring to keep going straight at junctions. */
function trace(edge: Uint8Array, w: number, h: number) {
  const visited = new Uint8Array(w * h);
  const chains: number[][] = [];
  const nbCount = (i: number) => {
    const x = i % w, y = (i - x) / w;
    let c = 0;
    for (let d = 0; d < 8; d++) {
      const xx = x + DX[d], yy = y + DY[d];
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && edge[yy * w + xx]) c++;
    }
    return c;
  };
  const follow = (start: number, pts: number[], firstDir = -1) => {
    let cur = start;
    let prev = firstDir;
    for (;;) {
      const x = cur % w, y = (cur - x) / w;
      let best = -1, bestD = -1, bestScore = 99;
      for (let d = 0; d < 8; d++) {
        const xx = x + DX[d], yy = y + DY[d];
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (!edge[k] || visited[k]) continue;
        let score = prev < 0 ? d % 2 : Math.min((d - prev + 8) % 8, (prev - d + 8) % 8);
        if (d % 2 === 1) score += 0.1; // prefer 4-neighbours on ties
        if (score < bestScore) {
          bestScore = score;
          best = k;
          bestD = d;
        }
      }
      if (best < 0) break;
      visited[best] = 1;
      pts.push(best % w, (best - (best % w)) / w);
      cur = best;
      prev = bestD;
    }
  };
  // Endpoints first, so open strokes trace from one end to the other.
  for (let i = 0; i < edge.length; i++) {
    if (!edge[i] || visited[i] || nbCount(i) !== 1) continue;
    visited[i] = 1;
    const pts = [i % w, (i - (i % w)) / w];
    follow(i, pts);
    chains.push(pts);
  }
  // Then whatever is left (closed loops, junction fragments): trace both ways.
  for (let i = 0; i < edge.length; i++) {
    if (!edge[i] || visited[i]) continue;
    visited[i] = 1;
    const fwd = [i % w, (i - (i % w)) / w];
    follow(i, fwd);
    const back: number[] = [];
    follow(i, back);
    const pts: number[] = [];
    for (let k = back.length - 2; k >= 0; k -= 2) pts.push(back[k], back[k + 1]);
    for (let k = 0; k < fwd.length; k++) pts.push(fwd[k]);
    chains.push(pts);
  }
  return chains;
}

function simplify(pts: number[], eps: number) {
  const n = pts.length / 2;
  if (n < 3) return pts;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = pts[a * 2], ay = pts[a * 2 + 1], bx = pts[b * 2], by = pts[b * 2 + 1];
    const dx = bx - ax, dy = by - ay;
    const L = Math.hypot(dx, dy) || 1;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i * 2] - dx * pts[i * 2 + 1] + bx * ay - by * ax) / L;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > eps && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1]);
  return out;
}

/** Deterministic PRNG so construction overshoots don't change between renders. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hough(edge: Uint8Array, w: number, h: number, want: number) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (edge[y * w + x]) { xs.push(x); ys.push(y); }
  const T = 180;
  const diag = Math.ceil(Math.hypot(w, h));
  const R = diag * 2 + 1;
  const cos = new Float32Array(T), sin = new Float32Array(T);
  for (let t = 0; t < T; t++) {
    cos[t] = Math.cos((t * Math.PI) / T);
    sin[t] = Math.sin((t * Math.PI) / T);
  }
  const acc = new Uint16Array(T * R);
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i], y = ys[i];
    for (let t = 0; t < T; t++) {
      const r = Math.round(x * cos[t] + y * sin[t]) + diag;
      const k = t * R + r;
      if (acc[k] < 65535) acc[k]++;
    }
  }
  // Local maxima in a (±3°, ±10px) window.
  const minVotes = Math.max(30, Math.min(w, h) * 0.08);
  const peaks: { t: number; r: number; v: number }[] = [];
  for (let t = 0; t < T; t++) {
    for (let r = 0; r < R; r++) {
      const v = acc[t * R + r];
      if (v < minVotes) continue;
      let isMax = true;
      for (let dt = -3; dt <= 3 && isMax; dt++) {
        const tt = (t + dt + T) % T;
        const flip = t + dt < 0 || t + dt >= T; // theta wraps with rho mirrored
        for (let dr = -10; dr <= 10; dr++) {
          if (dt === 0 && dr === 0) continue;
          let rr = r + dr;
          if (flip) rr = R - 1 - rr;
          if (rr < 0 || rr >= R) continue;
          const u = acc[tt * R + rr];
          if (u > v || (u === v && (dt < 0 || (dt === 0 && dr < 0)))) {
            isMax = false;
            break;
          }
        }
      }
      if (isMax) peaks.push({ t, r: r - diag, v });
    }
  }
  peaks.sort((a, b) => b.v - a.v);
  const cand = peaks.slice(0, want * 6);
  const segs: (Segment & { t: number; r: number })[] = [];
  const gapMax = Math.max(6, w * 0.018);
  const minLen = Math.min(w, h) * 0.14;
  for (const p of cand) {
    const c = cos[p.t], s = sin[p.t];
    const along: number[] = [];
    for (let i = 0; i < xs.length; i++) {
      const d = xs[i] * c + ys[i] * s - p.r;
      if (d > -1.5 && d < 1.5) along.push(-xs[i] * s + ys[i] * c);
    }
    if (along.length < minVotes * 0.6) continue;
    along.sort((a, b) => a - b);
    let bestA = 0, bestB = 0, a = 0, cnt = 1, bestCnt = 0;
    for (let i = 1; i <= along.length; i++) {
      if (i === along.length || along[i] - along[i - 1] > gapMax) {
        const len = along[i - 1] - along[a];
        if (len > bestB - bestA) {
          bestA = along[a];
          bestB = along[i - 1];
          bestCnt = cnt;
        }
        a = i;
        cnt = 1;
      } else cnt++;
    }
    const len = bestB - bestA;
    if (len < minLen || bestCnt < len * 0.45) continue;
    const x0 = p.r * c, y0 = p.r * s;
    segs.push({ x1: x0 - bestA * s, y1: y0 + bestA * c, x2: x0 - bestB * s, y2: y0 + bestB * c, len, t: p.t, r: p.r });
  }
  segs.sort((a, b) => b.len - a.len);
  const out: Segment[] = [];
  for (const sg of segs) {
    if (out.length >= want) break;
    // Skip near-duplicates of a line we already have.
    const dup = out.some((o) => {
      const oo = o as Segment & { t: number; r: number };
      const dt = Math.min(Math.abs(oo.t - sg.t), T - Math.abs(oo.t - sg.t));
      return dt <= 4 && Math.abs(oo.r - sg.r) < 18;
    });
    if (!dup) out.push(sg);
  }
  return out;
}

function roughinBitmap(blurred: Float32Array, edge: Uint8Array, w: number, h: number) {
  const out = new Uint8ClampedArray(w * h * 4);
  const stud = Math.max(12, Math.round(w / 24));
  const dark = [118, 94, 68], light = [212, 189, 152], line = [78, 60, 44];
  const hash = (x: number, y: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = Math.min(1, Math.max(0, 0.2 + blurred[i] * 0.8));
      // Plywood grain: long wavy bands, a little fine tooth.
      const grain = Math.sin(y * 0.36 + Math.sin(x * 0.009 + y * 0.003) * 6) * 0.03 + (hash(x, y) - 0.5) * 0.05;
      const sx = x % stud;
      // Studs at a regular pitch, softly shaded on one face.
      const studShade = sx < stud * 0.1 ? 0.9 : sx < stud * 0.16 ? 1.04 : 1;
      const k = (1 + grain) * studShade;
      let r = (dark[0] + (light[0] - dark[0]) * l) * k;
      let g = (dark[1] + (light[1] - dark[1]) * l) * k;
      let b = (dark[2] + (light[2] - dark[2]) * l) * k;
      let e = edge[i];
      if (!e && x > 0 && x < w - 1 && y > 0 && y < h - 1) e = edge[i - 1] | edge[i + 1] | edge[i - w] | edge[i + w];
      if (e) {
        r = r * 0.4 + line[0] * 0.6;
        g = g * 0.4 + line[1] * 0.6;
        b = b * 0.4 + line[2] * 0.6;
      }
      // Desaturate toward warm grey.
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      const j = i * 4;
      out[j] = lum + (r - lum) * 0.7;
      out[j + 1] = lum + (g - lum) * 0.7;
      out[j + 2] = lum + (b - lum) * 0.7;
      out[j + 3] = 255;
    }
  }
  return out;
}

type Kind = 0 | 1 | 2; // 0 = diagonal, 1 = horizontal, 2 = vertical

/**
 * Snap near-horizontal / near-vertical runs of a polyline to exact H/V, square off
 * short chamfers between an H run and a V run, and trim short hooks at the ends.
 * `pts` is a flat [x0, y0, x1, y1, …] list in analysis pixels.
 */
function snapPolyline(pts: number[], deg: number, chamfer: number, minSeg: number): number[] {
  const n = pts.length / 2;
  if (deg <= 0 || n < 2) return pts;
  const t = Math.tan((deg * Math.PI) / 180);
  const X = (i: number) => pts[i * 2], Y = (i: number) => pts[i * 2 + 1];
  const kindOf = (a: number, b: number): Kind => {
    const dx = Math.abs(X(b) - X(a)), dy = Math.abs(Y(b) - Y(a));
    if (dx + dy < minSeg) return 0; // too short to have a direction (stair steps, jitter)
    if (dy <= dx * t) return 1;
    if (dx <= dy * t) return 2;
    return 0;
  };
  // Group consecutive segments of the same axis into runs.
  type Run = { a: number; b: number; k: Kind; v: number };
  const runs: Run[] = [];
  for (let i = 0; i < n - 1; i++) {
    const k = kindOf(i, i + 1);
    const last = runs[runs.length - 1];
    // A run continues only while it keeps heading the same way (no hairpins).
    const same =
      last && last.k === k && k !== 0 &&
      (k === 1 ? Math.sign(X(i + 1) - X(i)) === Math.sign(X(last.b) - X(last.a)) : Math.sign(Y(i + 1) - Y(i)) === Math.sign(Y(last.b) - Y(last.a)));
    if (same) last.b = i + 1;
    else runs.push({ a: i, b: i + 1, k, v: 0 });
  }
  // Length-weighted mean coordinate of each axis run.
  for (const r of runs) {
    if (r.k === 0) continue;
    let acc = 0, wsum = 0;
    for (let i = r.a; i < r.b; i++) {
      const L = Math.hypot(X(i + 1) - X(i), Y(i + 1) - Y(i)) || 1e-3;
      acc += (r.k === 1 ? (Y(i) + Y(i + 1)) / 2 : (X(i) + X(i + 1)) / 2) * L;
      wsum += L;
    }
    r.v = acc / wsum;
  }
  // Rebuild: one vertex per run boundary; H runs fix y, V runs fix x.
  const vx: number[] = [], vy: number[] = [];
  const kinds: Kind[] = [];
  for (let j = 0; j < runs.length; j++) {
    const r = runs[j];
    if (j === 0) {
      vx.push(X(r.a));
      vy.push(Y(r.a));
    }
    vx.push(X(r.b));
    vy.push(Y(r.b));
    kinds.push(r.k);
  }
  // Apply constraints: vertex j sits between segment j-1 and segment j.
  for (let j = 0; j < kinds.length; j++) {
    const r = runs[j];
    if (r.k === 1) vy[j] = vy[j + 1] = r.v;
    else if (r.k === 2) vx[j] = vx[j + 1] = r.v;
  }
  // Re-apply so a vertex shared by an H run and a V run takes y from one, x from the other.
  for (let j = 0; j < kinds.length; j++) {
    const r = runs[j];
    if (r.k === 1) {
      vy[j] = vy[j + 1] = r.v;
    }
  }
  for (let j = 0; j < kinds.length; j++) {
    const r = runs[j];
    if (r.k === 2) {
      vx[j] = vx[j + 1] = r.v;
    }
  }
  // Square chamfers: H, short diagonal, V (or V, short, H) → the corner.
  for (let j = 1; j < kinds.length - 1; j++) {
    if (kinds[j] !== 0) continue;
    const L = Math.hypot(vx[j + 1] - vx[j], vy[j + 1] - vy[j]);
    if (L > chamfer) continue;
    const a = kinds[j - 1], b = kinds[j + 1];
    if (a === 1 && b === 2) {
      const cx = runs[j + 1].v, cy = runs[j - 1].v;
      vx[j] = vx[j + 1] = cx;
      vy[j] = vy[j + 1] = cy;
    } else if (a === 2 && b === 1) {
      const cx = runs[j - 1].v, cy = runs[j + 1].v;
      vx[j] = vx[j + 1] = cx;
      vy[j] = vy[j + 1] = cy;
    }
  }
  // Trim short diagonal hooks hanging off an axis run at either end.
  let s0 = 0, s1 = kinds.length; // segment range to keep
  if (kinds.length > 1 && kinds[0] === 0 && kinds[1] !== 0 && Math.hypot(vx[1] - vx[0], vy[1] - vy[0]) <= chamfer) s0 = 1;
  if (kinds.length > 1 && kinds[s1 - 1] === 0 && kinds[s1 - 2] !== 0 && Math.hypot(vx[s1] - vx[s1 - 1], vy[s1] - vy[s1 - 1]) <= chamfer) s1 -= 1;
  const out: number[] = [];
  for (let j = s0; j <= s1; j++) {
    const x = vx[j], y = vy[j];
    const m = out.length;
    if (m >= 2 && Math.abs(out[m - 2] - x) < 0.01 && Math.abs(out[m - 1] - y) < 0.01) continue; // collapsed chamfer
    out.push(x, y);
  }
  return out.length >= 4 ? out : pts;
}

/** Share of polyline `a` (sampled every ~2px) lying within `tol` of polyline `b`. */
function coverage(a: number[], b: number[], tol: number) {
  let inside = 0, total = 0;
  const t2 = tol * tol;
  for (let i = 0; i < a.length - 2; i += 2) {
    const ax = a[i], ay = a[i + 1], dx = a[i + 2] - ax, dy = a[i + 3] - ay;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const px = ax + (dx * k) / steps, py = ay + (dy * k) / steps;
      total++;
      for (let j = 0; j < b.length - 2; j += 2) {
        const bx = b[j], by = b[j + 1], ex = b[j + 2] - bx, ey = b[j + 3] - by;
        const L2 = ex * ex + ey * ey || 1e-9;
        const u = Math.max(0, Math.min(1, ((px - bx) * ex + (py - by) * ey) / L2));
        const qx = bx + ex * u - px, qy = by + ey * u - py;
        if (qx * qx + qy * qy <= t2) {
          inside++;
          break;
        }
      }
    }
  }
  return total ? inside / total : 0;
}

/** Length, closure and wiggliness of a simplified polyline (analysis pixels). */
function shape(pts: number[]) {
  const n = pts.length / 2;
  let len = 0, turn = 0, prevA = NaN;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    if (i === 0) continue;
    const dx = x - pts[i * 2 - 2], dy = y - pts[i * 2 - 1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    len += L;
    const a = Math.atan2(dy, dx);
    if (!Number.isNaN(prevA)) {
      let d = Math.abs(a - prevA);
      if (d > Math.PI) d = 2 * Math.PI - d;
      turn += d;
    }
    prevA = a;
  }
  const gap = Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]);
  const closed = n > 3 && gap <= Math.max(3, len * 0.06);
  return { len, turn, closed, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, bw: x1 - x0, bh: y1 - y0 };
}

export function linework(input: LineworkInput): LineworkOutput {
  const t0 = performance.now();
  const { rgba, w, h, outW, outH, params } = input;
  const merge = params.merge ?? 2; // defaults mirror ENGINE_DEFAULTS in lib/site.ts
  const snapDeg = params.snap ?? 3.5;
  const texture = params.texture ?? 1;
  const gray = luminance(rgba, w, h);
  const blurred = gaussian(gray, w, h, params.blur);
  const nms = sobelNms(blurred, w, h);
  const gain = params.boost?.length ? gainMap(w, h, params.boost) : undefined;
  const edge = hysteresis(nms, w, h, params.density, params.low, gain);
  if (params.exclude?.length) excludeRegions(edge, w, h, params.exclude);
  despeck(edge, w, h, params.speck);
  thin(edge, w, h);
  let edgeCount = 0;
  for (let i = 0; i < edge.length; i++) edgeCount += edge[i];

  // Vector strokes: trace, simplify, snap, then drop texture.
  const scale = w / 1200; // thresholds below are tuned for a 1200px-wide analysis image
  const chamfer = 6 * scale;
  type Cand = { pts: number[]; len: number; turn: number; closed: boolean; cx: number; cy: number; bw: number; bh: number; wiggly: boolean };
  const cands: Cand[] = [];
  const dropped: number[][] = [];
  for (const chain of input.skipVectors ? [] : trace(edge, w, h)) {
    let pts = simplify(chain, params.simplify);
    if (pts.length < 4) continue;
    pts = snapPolyline(pts, snapDeg, chamfer, 5 * scale);
    const sh = shape(pts);
    // Wiggly: turns a lot for its length (leaves, stone, scribble), or never goes straight.
    const wiggly = sh.len < 70 * scale && (sh.turn / Math.max(1, sh.len) > 0.055 / Math.max(0.35, texture) || sh.turn > Math.PI * 1.4);
    cands.push({ pts, ...sh, wiggly });
  }
  const keep = new Uint8Array(cands.length).fill(1);
  if (texture > 0) {
    // Small closed loops: recessed cans, knobs, outlets. They read as floating ovals.
    const loopMax = 130 * scale * Math.min(2, texture);
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i];
      if (c.closed && c.len < loopMax && Math.max(c.bw, c.bh) < 0.06 * w) keep[i] = 0;
    }
    // Clusters of short wiggly strokes: a bouquet, a faucet, a stone wall.
    const R = 34 * scale * Math.min(2, 0.6 + texture * 0.4);
    const need = Math.max(1, Math.round(3 / texture));
    const wig = cands.map((c, i) => (c.wiggly ? i : -1)).filter((i) => i >= 0);
    for (const i of wig) {
      const c = cands[i];
      let near = 0;
      for (const j of wig) {
        if (j === i) continue;
        const d = cands[j];
        if (Math.abs(d.cx - c.cx) < R && Math.abs(d.cy - c.cy) < R) near++;
        if (near >= need) break;
      }
      if (near >= need || c.turn > Math.PI * 2.2) keep[i] = 0;
    }
  }
  // Parallel edges a few pixels apart (both faces of a trim board, a shaker rail, a pull):
  // a stroke that mostly runs alongside a longer kept one is the same line drawn twice.
  if (merge > 0) {
    const tol = 1 + merge * 2 * scale;
    const order = cands.map((_, i) => i).filter((i) => keep[i]).sort((a, b) => cands[b].len - cands[a].len);
    const kept: number[] = [];
    for (const i of order) {
      const c = cands[i];
      const x0 = c.cx - c.bw / 2 - tol, x1 = c.cx + c.bw / 2 + tol, y0 = c.cy - c.bh / 2 - tol, y1 = c.cy + c.bh / 2 + tol;
      let dup = false;
      for (const j of kept) {
        const d = cands[j];
        if (d.cx + d.bw / 2 < x0 || d.cx - d.bw / 2 > x1 || d.cy + d.bh / 2 < y0 || d.cy - d.bh / 2 > y1) continue;
        if (coverage(c.pts, d.pts, tol) >= 0.72) {
          dup = true;
          break;
        }
      }
      if (dup) keep[i] = 0;
      else kept.push(i);
    }
  }
  const sx = outW / w, sy = outH / h;
  const strokes: Stroke[] = [];
  const toStroke = (pts: number[], len: number): Stroke => {
    let d = "";
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const x = Math.round(pts[i] * sx), y = Math.round(pts[i + 1] * sy);
      d += (i === 0 ? "M" : "L") + x + " " + y;
      cx += x;
      cy += y;
    }
    const n = pts.length / 2;
    return { d, len: Math.round(len * sx), x: Math.round(cx / n), y: Math.round(cy / n) };
  };
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    if (keep[i] && c.len >= params.minStroke) strokes.push(toStroke(c.pts, c.len));
    else if (input.debug) dropped.push(c.pts);
  }

  const rand = rng(w * 131 + h);
  const lines: Segment[] = input.skipVectors
    ? []
    : hough(edge, w, h, params.lines).map((s) => {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        const L = Math.hypot(dx, dy) || 1;
        const o1 = params.overshoot * w * (0.5 + rand()), o2 = params.overshoot * w * (0.5 + rand());
        const r2 = (v: number) => Math.round(v * 100) / 100;
        return {
          x1: r2((s.x1 - (dx / L) * o1) * sx),
          y1: r2((s.y1 - (dy / L) * o1) * sy),
          x2: r2((s.x2 + (dx / L) * o2) * sx),
          y2: r2((s.y2 + (dy / L) * o2) * sy),
          len: Math.round((L + o1 + o2) * sx),
        };
      });

  const roughin = input.roughin ? roughinBitmap(blurred, edge, w, h) : undefined;
  return {
    w,
    h,
    outW,
    outH,
    strokes,
    lines,
    edgeCount,
    roughin,
    dropped: input.debug ? dropped.map((p) => toStroke(p, 0)) : undefined,
    ms: Math.round(performance.now() - t0),
  };
}
