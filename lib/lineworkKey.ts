import type { EngineParams } from "./site";

/** Bump when lib/linework.ts changes what it draws, so stale precomputed files are ignored. */
export const ENGINE_VERSION = 3;

/** FNV-1a, 32-bit, as 8 hex digits. */
function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Where the precomputed drawing for this photo + engine settings lives, relative to the
 * site root. `npm run linework` writes it; the page fetches it before falling back to the worker.
 */
export const lineworkFile = (photoId: string, params: EngineParams, analysisW: number) =>
  `linework/${photoId}-${fnv(JSON.stringify([ENGINE_VERSION, analysisW, params]))}.json`;
