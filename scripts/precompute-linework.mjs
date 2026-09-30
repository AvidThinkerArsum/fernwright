#!/usr/bin/env node
/**
 * Precomputes the hero and A-103 drawings so the sheet is never blank on first paint.
 *
 * For every hero preset and project card in lib/site.ts it downloads the same Pexels
 * analysis image the browser would, runs lib/linework.ts on it, and writes
 * public/linework/<photoId>-<hash>.json. The page fetches that file first and only falls
 * back to the Web Worker when it is missing (a new photo, or `?calibrate` slider changes).
 *
 *   npm run linework            compute missing files, prune stale ones
 *   npm run linework -- --force recompute everything
 *
 * `npm run build` runs it with --soft: no network or an older Node only prints a warning.
 * Needs Node 22.15+ (TypeScript stripping and module.registerHooks).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const soft = process.argv.includes("--soft");
const force = process.argv.includes("--force");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "linework");

function bail(msg) {
  console.warn(`[linework] ${msg}`);
  process.exit(soft ? 0 : 1);
}

let mod;
try {
  mod = await import("node:module");
  if (typeof mod.registerHooks !== "function") throw new Error("module.registerHooks is unavailable");
  // lib/*.ts import each other without extensions, the way the bundler resolves them.
  mod.registerHooks({
    resolve(spec, ctx, next) {
      try {
        return next(spec, ctx);
      } catch (e) {
        if (/^\.{1,2}\//.test(spec) && !path.extname(spec)) return next(spec + ".ts", ctx);
        throw e;
      }
    },
  });
} catch (e) {
  bail(`skipped: ${e.message}. The page will trace the photo in the browser instead.`);
}

const load = (f) => import(pathToFileURL(path.join(root, "lib", f)).href);
let site, engine, key, jpeg;
try {
  [site, engine, key, jpeg] = await Promise.all([load("site.ts"), load("linework.ts"), load("lineworkKey.ts"), import("jpeg-js")]);
} catch (e) {
  bail(`skipped: could not load the engine (${e.message}).`);
}
const { HERO_PRESETS, SITE, pexels, cardEngine, CARD_ANALYSIS_W } = site;

const jobs = [
  ...Object.values(HERO_PRESETS).map((p) => ({ photo: p.photo, params: p.engine, analysisW: 1200 })),
  ...SITE.projects.map((p) => ({ photo: p.photo, params: cardEngine(p), analysisW: CARD_ANALYSIS_W })),
];

fs.mkdirSync(outDir, { recursive: true });
const wanted = new Set();
let wrote = 0, failed = 0;
for (const job of jobs) {
  const rel = key.lineworkFile(job.photo.id, job.params, job.analysisW);
  const file = path.join(root, "public", rel);
  wanted.add(path.basename(file));
  if (!force && fs.existsSync(file)) continue;
  try {
    const res = await fetch(pexels(job.photo.id, job.analysisW));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const img = jpeg.default.decode(Buffer.from(await res.arrayBuffer()), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256 });
    const out = engine.linework({
      rgba: new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.byteLength),
      w: img.width,
      h: img.height,
      outW: job.photo.w,
      outH: job.photo.h,
      params: job.params,
      roughin: false,
    });
    const json = { v: key.ENGINE_VERSION, photo: job.photo.id, analysisW: job.analysisW, outW: out.outW, outH: out.outH, strokes: out.strokes, lines: out.lines };
    fs.writeFileSync(file, JSON.stringify(json));
    wrote++;
    console.log(`[linework] ${rel}  ${out.strokes.length} strokes, ${out.lines.length} lines, ${Math.round(fs.statSync(file).size / 1024)} KB, ${out.ms} ms`);
  } catch (e) {
    failed++;
    console.warn(`[linework] ${job.photo.id}: ${e.message}`);
  }
}
// Drop files no preset or card uses any more.
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith(".json") && !wanted.has(f)) {
    fs.unlinkSync(path.join(outDir, f));
    console.log(`[linework] removed stale ${f}`);
  }
}
console.log(`[linework] ${wrote} written, ${wanted.size - wrote - failed} up to date${failed ? `, ${failed} failed` : ""}.`);
if (failed && !soft) process.exit(1);
