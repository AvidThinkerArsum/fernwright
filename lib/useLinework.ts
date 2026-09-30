"use client";

import { useEffect, useMemo, useState } from "react";
import { linework, type LineworkOutput, type Segment, type Stroke } from "./linework";
import { lineworkFile } from "./lineworkKey";
import { pexels, type EngineParams, type Photo } from "./site";

export type Drawing = {
  outW: number;
  outH: number;
  strokes: Stroke[];
  lines: Segment[];
  roughinUrl?: string;
  /** Engine time in ms; 0 when the drawing came precomputed. */
  ms: number;
};
type Vectors = Omit<Drawing, "roughinUrl">;

type Pending = { resolve: (o: LineworkOutput) => void; reject: (e: Error) => void };

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, Pending>();
const vectorCache = new Map<string, Promise<Vectors>>();
const roughCache = new Map<string, Promise<string>>();

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./linework.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; out?: LineworkOutput; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.out) p.resolve(e.data.out);
      else p.reject(new Error(e.data.error || "linework failed"));
    };
    worker.onerror = () => {
      for (const p of pending.values()) p.reject(new Error("worker error"));
      pending.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Pexels sends Access-Control-Allow-Origin: *, so a crossOrigin image can be read back. */
async function loadPixels(src: string, maxW: number) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const w = Math.min(maxW, img.naturalWidth);
  const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  return { data: g.getImageData(0, 0, w, h), w, h };
}

async function toUrl(rgba: Uint8ClampedArray, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
  return blob ? URL.createObjectURL(blob) : c.toDataURL("image/jpeg", 0.86);
}

/** Run the engine on the photo, in the worker when there is one. */
async function runEngine(photo: Photo, params: EngineParams, analysisW: number, mode: "vectors" | "roughin") {
  const { data, w, h } = await loadPixels(pexels(photo.id, analysisW), analysisW);
  const input = { w, h, outW: photo.w, outH: photo.h, params, roughin: mode === "roughin", skipVectors: mode === "roughin" };
  const wk = getWorker();
  if (!wk) return linework({ ...input, rgba: data.data });
  const id = ++seq;
  return new Promise<LineworkOutput>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const buf = data.data.buffer as ArrayBuffer;
    wk.postMessage({ id, ...input, rgba: buf }, [buf]);
  });
}

function cached<T>(map: Map<string, Promise<T>>, key: string, make: () => Promise<T>) {
  const hit = map.get(key);
  if (hit) return hit;
  const job = make();
  map.set(key, job);
  job.catch(() => map.delete(key));
  return job;
}

/** The drawing's strokes and construction lines: the precomputed file first, the engine second. */
export function vectorsFor(photo: Photo, params: EngineParams, analysisW: number, tryFile = true) {
  const file = lineworkFile(photo.id, params, analysisW);
  return cached(vectorCache, file, async () => {
    if (tryFile) {
      try {
        const res = await fetch(`${BASE}/${file}`);
        if (res.ok) {
          const j = (await res.json()) as Vectors;
          if (j.strokes?.length) return { outW: j.outW, outH: j.outH, strokes: j.strokes, lines: j.lines, ms: 0 };
        }
      } catch {
        // Offline, or not precomputed yet: trace it here instead.
      }
    }
    const out = await runEngine(photo, params, analysisW, "vectors");
    return { outW: out.outW, outH: out.outH, strokes: out.strokes, lines: out.lines, ms: out.ms };
  });
}

/** The plywood rough-in band's bitmap. Only needed once the laser starts, so it is made after first paint. */
function roughinFor(photo: Photo, params: EngineParams, analysisW: number) {
  return cached(roughCache, lineworkFile(photo.id, params, analysisW), async () => {
    const out = await runEngine(photo, params, analysisW, "roughin");
    if (!out.roughin) throw new Error("no rough-in");
    return toUrl(out.roughin, out.w, out.h);
  });
}

type State = { key: string; vectors?: Vectors; roughinUrl?: string; error?: string };

/** Generate the drawing for a photo once `enabled` is true. */
export function useLinework(
  photo: Photo,
  params: EngineParams,
  opts: { roughin?: boolean; enabled?: boolean; analysisW?: number; /** false while calibrating: settings no file was made for */ precomputed?: boolean } = {},
) {
  const { roughin = false, enabled = true, analysisW = 1200, precomputed = true } = opts;
  const [state, setState] = useState<State>({ key: "" });
  const key = `${photo.id}|${JSON.stringify(params)}|${roughin}|${analysisW}`;
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const merge = (patch: Partial<State>) => {
      if (live) setState((s) => ({ ...(s.key === key ? s : { key }), ...patch }));
    };
    vectorsFor(photo, params, analysisW, precomputed)
      .then((vectors) => merge({ vectors }))
      .catch((e: Error) => merge({ error: e.message }));
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (roughin) {
      // Let the plot animation have the main thread first.
      timer = setTimeout(() => {
        roughinFor(photo, params, analysisW)
          .then((roughinUrl) => merge({ roughinUrl }))
          .catch(() => {});
      }, 900);
    }
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  const cur = state.key === key ? state : undefined;
  const vectors = cur?.vectors;
  const roughinUrl = cur?.roughinUrl;
  const drawing = useMemo<Drawing | undefined>(() => (vectors ? { ...vectors, roughinUrl } : undefined), [vectors, roughinUrl]);
  return { key, drawing, error: cur?.error };
}
