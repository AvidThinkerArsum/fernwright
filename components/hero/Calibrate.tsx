"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { ENGINE_DEFAULTS, HERO_PRESETS, type EngineParams, type EngineSlider, type HeroPreset } from "@/lib/site";
import type { Geo } from "./model";

/** Dev-only. `?calibrate` opens the panel; `?preset=<key>` swaps the hero photo. */
export const CALIBRATE_ALLOWED = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_CALIBRATE === "1";

const noop = () => () => {};

export function useCalibrateFlags(): { calibrate: boolean; preset?: HeroPreset } {
  // The query string, read only after hydration (the static HTML never has it).
  const search = useSyncExternalStore(
    noop,
    () => (CALIBRATE_ALLOWED ? window.location.search : ""),
    () => "",
  );
  return useMemo(() => {
    if (!search) return { calibrate: false };
    const q = new URLSearchParams(search);
    const key = q.get("preset") as keyof typeof HERO_PRESETS | null;
    return { calibrate: q.has("calibrate"), preset: key && key in HERO_PRESETS ? (HERO_PRESETS[key] as HeroPreset) : undefined };
  }, [search]);
}

const SLIDERS: { k: EngineSlider; min: number; max: number; step: number; label: string }[] = [
  { k: "blur", min: 0.4, max: 4, step: 0.1, label: "Blur σ" },
  { k: "density", min: 0.04, max: 0.5, step: 0.01, label: "Edge density (high)" },
  { k: "low", min: 0.15, max: 0.9, step: 0.01, label: "Low / high" },
  { k: "speck", min: 0, max: 120, step: 1, label: "Speck removal (px)" },
  { k: "merge", min: 0, max: 3, step: 1, label: "Merge parallel edges (px)" },
  { k: "minStroke", min: 0, max: 120, step: 1, label: "Shortest stroke (px)" },
  { k: "simplify", min: 0.3, max: 4, step: 0.1, label: "Simplify ε" },
  { k: "snap", min: 0, max: 10, step: 0.5, label: "Snap to H/V (°)" },
  { k: "texture", min: 0, max: 3, step: 0.1, label: "Texture filter" },
  { k: "lines", min: 0, max: 40, step: 1, label: "Construction lines" },
  { k: "overshoot", min: 0, max: 0.15, step: 0.005, label: "Overshoot" },
];

/** Engine defaults for the optional knobs, so each slider shows where it really sits. */
const sliderValue = (e: EngineParams, k: EngineSlider) => e[k] ?? ENGINE_DEFAULTS[k as keyof typeof ENGINE_DEFAULTS] ?? 0;

type Target = { kind: "anchor" | "phone"; i: number } | { kind: "focus" } | { kind: "phoneFocus" } | { kind: "floor" } | { kind: "ceiling" };

export function Calibrate({
  preset,
  setPreset,
  geo,
  frame,
  photoOverlay,
  setPhotoOverlay,
  drawingMs,
}: {
  preset: HeroPreset;
  setPreset: (p: HeroPreset) => void;
  geo: Geo;
  frame: RefObject<HTMLDivElement | null>;
  photoOverlay: number;
  setPhotoOverlay: (v: number) => void;
  drawingMs?: number;
}) {
  const [engine, setEngine] = useState(preset.engine);
  const [target, setTarget] = useState<Target>({ kind: "anchor", i: 0 });
  const [copied, setCopied] = useState(false);
  const first = useRef(true);

  // Debounce slider changes so the worker isn't flooded.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => setPreset({ ...preset, engine }), 220);
    return () => clearTimeout(t);
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log("[calibrate] hero preset\n" + JSON.stringify(preset, null, 2));
  }, [preset]);

  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  function place(e: React.MouseEvent<HTMLDivElement>) {
    const f = frame.current!.getBoundingClientRect();
    const fx = r3((e.clientX - f.left - geo.px) / geo.pw);
    const fy = r3((e.clientY - f.top - geo.py) / geo.ph);
    const p = structuredClone(preset);
    if (target.kind === "anchor") p.callouts[target.i].at = [fx, fy];
    else if (target.kind === "phone") p.callouts[target.i].phone.at = [fx, fy];
    else if (target.kind === "focus") p.focus = [fx, fy];
    else if (target.kind === "phoneFocus") p.phoneFocus = fx;
    else if (target.kind === "floor") p.floorY = fy;
    else if (target.kind === "ceiling") p.ceilingY = fy;
    setPreset(p);
  }

  const targets: { t: Target; label: string }[] = [
    ...preset.callouts.map((c, i) => ({ t: { kind: "anchor", i } as Target, label: `${c.n} anchor` })),
    ...preset.callouts.map((c, i) => ({ t: { kind: "phone", i } as Target, label: `${c.n} phone label` })),
    { t: { kind: "focus" }, label: "Full-bleed focus" },
    { t: { kind: "phoneFocus" }, label: "Phone crop centre" },
    { t: { kind: "floor" }, label: "Floor line" },
    { t: { kind: "ceiling" }, label: "Ceiling line" },
  ];
  const same = (a: Target, b: Target) => a.kind === b.kind && ("i" in a ? "i" in b && a.i === b.i : true);
  const json = JSON.stringify(preset, null, 2);

  return (
    <>
      <div
        onClick={place}
        className="absolute z-30 cursor-crosshair"
        style={{ left: geo.hole.x, top: geo.hole.y, width: geo.hole.w, height: geo.hole.h }}
        title="Click to place the selected item"
      />
      <div className="absolute right-3 top-16 z-40 max-h-[calc(100%-5rem)] w-[340px] overflow-auto border border-graphite/40 bg-paper p-4 text-[12px] shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
        <p className="mono text-[11px] font-medium">Calibrate · dev only</p>
        <label className="mono mt-3 block text-[9.5px] text-graphite/60">Preset</label>
        <select
          className="mt-1 w-full border border-graphite/30 bg-paper px-2 py-1.5"
          value={(Object.keys(HERO_PRESETS) as (keyof typeof HERO_PRESETS)[]).find((k) => HERO_PRESETS[k].photo.id === preset.photo.id) ?? ""}
          onChange={(e) => setPreset(HERO_PRESETS[e.target.value as keyof typeof HERO_PRESETS] as HeroPreset)}
        >
          {Object.keys(HERO_PRESETS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <p className="mono mt-4 text-[9.5px] text-graphite/60">Engine {drawingMs ? `· ${drawingMs} ms` : "· working…"}</p>
        {SLIDERS.map((s) => (
          <label key={s.k} className="mt-2 block">
            <span className="flex justify-between">
              <span>{s.label}</span>
              <span className="mono">{sliderValue(engine, s.k)}</span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={sliderValue(engine, s.k)}
              onChange={(e) => setEngine({ ...engine, [s.k]: Number(e.target.value) })}
              className="w-full accent-[#2f4b3c]"
            />
          </label>
        ))}

        <label className="mt-3 block">
          <span className="flex justify-between">
            <span>Photo overlay</span>
            <span className="mono">{photoOverlay.toFixed(2)}</span>
          </span>
          <input type="range" min={0} max={1} step={0.05} value={photoOverlay} onChange={(e) => setPhotoOverlay(Number(e.target.value))} className="w-full accent-[#2f4b3c]" />
        </label>

        <p className="mono mt-4 text-[9.5px] text-graphite/60">Click-to-place</p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {targets.map(({ t, label }) => (
            <button
              key={label}
              onClick={() => setTarget(t)}
              className={`border px-2 py-1 text-left text-[11px] ${same(t, target) ? "border-graphite bg-graphite text-paper" : "border-graphite/25"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="mono text-[9.5px] text-graphite/60">Config JSON (also in console)</p>
          <button
            className="mono border border-graphite/40 px-2 py-1 text-[10px]"
            onClick={() => {
              navigator.clipboard?.writeText(json).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="mt-1 max-h-60 overflow-auto bg-graphite/5 p-2 text-[10px] leading-snug">{json}</pre>
      </div>
    </>
  );
}
