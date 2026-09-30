"use client";

import { useReduced } from "@/lib/useReduced";
import { useInView } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { capitalize, numberWord } from "@/lib/format";
import { CARD_ANALYSIS_W, cardEngine, pexels, SITE, type Project } from "@/lib/site";
import { useLinework } from "@/lib/useLinework";
import { Rise, Words } from "@/components/ui/Reveal";
import { Sample } from "@/components/ui/Sample";
import { SheetStrip } from "@/components/ui/Sheet";
import { Nums } from "@/components/ui/Nums";


function Card({ p, i }: { p: Project; i: number }) {
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, { once: true, margin: "900px 0px 900px 0px" });
  const seen = useInView(box, { once: true, margin: "-18% 0px -18% 0px" });
  const reduce = useReduced();
  const engine = useMemo(() => cardEngine(p), [p]);
  const { drawing, error } = useLinework(p.photo, engine, { enabled: near && !reduce, analysisW: CARD_ANALYSIS_W });
  const [developed, setDeveloped] = useState(false);

  useEffect(() => {
    if (!seen || error) return;
    if (!drawing) {
      const t = setTimeout(() => setDeveloped(true), 3500); // never leave a blank card
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDeveloped(true), 1700);
    return () => clearTimeout(t);
  }, [seen, drawing, error]);

  const strokes = useMemo(() => {
    if (!drawing) return [];
    const s = [...drawing.strokes].sort((a, b) => b.len - a.len);
    return s.map((k, r) => ({ d: k.d, delay: (r / Math.max(1, s.length - 1)) * 1.1, heavy: k.len > p.photo.w * 0.1 }));
  }, [drawing, p.photo.w]);

  // Non-breaking spaces keep "14 WKS" and "1972 RAMBLER" on one line.
  const caption = `${p.room} · ${p.town.toUpperCase()} · ${p.house.replace(" ", "\u00a0")} · ${p.weeks}\u00a0WKS · ${p.range}`;
  const show = reduce || developed || !!error;

  return (
    <figure className={i % 2 === 1 ? "md:mt-28" : ""}>
      <div ref={box} className="paper relative aspect-[3/2] overflow-hidden border border-graphite/30">
        {seen && drawing && !reduce ? (
          <svg viewBox={`0 0 ${p.photo.w} ${p.photo.h}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
            <g fill="none" stroke="#202326" strokeLinecap="round" strokeLinejoin="round">
              {drawing.lines.map((l, k) => (
                <line
                  key={`c${k}`}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  strokeOpacity={0.25}
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  className="plot"
                  style={{ "--delay": `${k * 0.03}s`, "--dur": "0.7s" } as React.CSSProperties}
                />
              ))}
              {strokes.map((s, k) => (
                <path
                  key={k}
                  d={s.d}
                  strokeOpacity={s.heavy ? 0.85 : 0.65}
                  strokeWidth={s.heavy ? 0.95 : 0.7}
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  className="plot"
                  style={{ "--delay": `${(0.2 + s.delay).toFixed(3)}s`, "--dur": "0.45s" } as React.CSSProperties}
                />
              ))}
            </g>
          </svg>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pexels(p.photo.id, 1400)}
          alt={p.photo.alt}
          loading="lazy"
          decoding="async"
          className={`develop absolute inset-0 h-full w-full object-cover ${show ? "is-developed" : ""}`}
        />
        <span className="mono absolute left-0 top-0 border-b border-r border-graphite/30 bg-paper/90 px-2 py-1 text-[9px] text-graphite/70">
          Detail {i + 1} / A-103
        </span>
      </div>
      <figcaption className="grid grid-cols-[1fr_auto] border-x border-b border-graphite/30">
        <div className="px-3.5 py-3">
          <p className="mono text-[10.5px] font-medium leading-snug tracking-[0.05em]">
            {caption} <Sample />
          </p>
          <p className="mt-1.5 text-[14px] leading-snug text-graphite/70">
            <Nums>{p.note}</Nums>
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

export function Work() {
  return (
    <section id="work" className="paper relative scroll-mt-16 pb-20 pt-16 lg:pb-24 lg:pt-20">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-10">
        <SheetStrip sheet="A-103" title={`Recent work · ${SITE.region}`} short="Recent work" scale="AS BUILT" />
        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12">
          <h2 className="display text-[clamp(2.6rem,6vw,4.6rem)] lg:col-span-7">
            <Words text="Recent work," />
            <br />
            <Words italic="with the price on it." delay={0.12} />
          </h2>
          <Rise delay={0.2} className="self-end text-[15.5px] leading-relaxed text-graphite/75 lg:col-span-5">
            <p>
              {capitalize(numberWord(SITE.projects.length))} projects from the last two years. Each one develops from our drawing into the finished room. The range is what the owners paid, design phase included. <Sample />
            </p>
          </Rise>
        </div>
        <div className="mt-14 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:mt-20">
          {SITE.projects.map((p, i) => (
            <Card key={p.photo.id} p={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
