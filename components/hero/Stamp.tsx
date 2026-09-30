import { useId } from "react";

/** A rubber AS BUILT stamp: laser-red ink, speckled voids, slightly wandering edges. */
/** Squeeze a line to the stamp's width when a long business name would overrun it. */
const fit = (s: string, fs: number, ls: number, max: number) =>
  s.length * (fs * 0.6 + ls) > max ? ({ textLength: max, lengthAdjust: "spacingAndGlyphs" } as const) : {};

export function Stamp({ top, bottom, className = "" }: { top: string; bottom: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 320 150" className={className} role="img" aria-label="As built stamp">
      <defs>
        <filter id={`${id}-ink`} x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="4" result="fine" />
          <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 4.3" result="speckle" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="11" result="blot" />
          <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 0 0 0 1.9" result="uneven" />
          <feComposite in="speckle" in2="uneven" operator="in" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="inked" />
          <feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="2" seed="2" result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#${id}-ink)`} fill="#e5361f" stroke="#e5361f">
        <rect x="6" y="6" width="308" height="138" rx="10" fill="none" strokeWidth="6" />
        <rect x="16" y="16" width="288" height="118" rx="5" fill="none" strokeWidth="1.6" />
        <text x="160" y="44" textAnchor="middle" fontSize="14" letterSpacing="2" stroke="none" {...fit(top, 14, 2, 264)} style={{ fontFamily: "var(--font-plex-mono)", fontWeight: 700 }}>
          {top}
        </text>
        <line x1="34" x2="286" y1="53" y2="53" strokeWidth="1.4" />
        <text x="160" y="100" textAnchor="middle" fontSize="50" letterSpacing="3" stroke="none" style={{ fontFamily: "var(--font-plex-mono)", fontWeight: 700 }}>
          AS BUILT
        </text>
        <line x1="34" x2="286" y1="111" y2="111" strokeWidth="1.4" />
        <text x="160" y="129" textAnchor="middle" fontSize="13" letterSpacing="1.6" stroke="none" {...fit(bottom, 13, 1.6, 264)} style={{ fontFamily: "var(--font-plex-mono)", fontWeight: 700 }}>
          {bottom}
        </text>
      </g>
    </svg>
  );
}
