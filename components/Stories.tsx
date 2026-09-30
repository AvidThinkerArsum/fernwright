"use client";

import { useReduced } from "@/lib/useReduced";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { Rise, Words } from "@/components/ui/Reveal";
import { Sample } from "@/components/ui/Sample";
import { SheetStrip } from "@/components/ui/Sheet";
import { Nums } from "@/components/ui/Nums";

/** Seeded wobble so the red pencil looks hand-drawn but renders the same every time. */
function wobble(x0: number, x1: number, y: number, seed: number) {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pts: string[] = [];
  const tilt = (rnd() - 0.5) * 5;
  const n = Math.max(3, Math.round((x1 - x0) / 26));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const yy = y + tilt * (t - 0.5) + (rnd() - 0.5) * 3.2;
    pts.push(`${i === 0 ? "M" : "L"}${Math.round(x * 10) / 10} ${Math.round(yy * 10) / 10}`);
  }
  return pts.join(" ");
}

/** Red-pencil strike-through across every rendered line of the text. */
function Strike({ text, seed }: { text: string; seed: number }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const span = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState<{ x0: number; x1: number; y: number }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduce = useReduced();
  useEffect(() => {
    const measure = () => {
      const w = wrap.current, sp = span.current;
      if (!w || !sp) return;
      const base = w.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(sp);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 4);
      // merge rects that sit on the same line
      const merged: { x0: number; x1: number; y: number }[] = [];
      for (const r of rects) {
        const y = r.top - base.top + r.height * 0.56;
        const hit = merged.find((m) => Math.abs(m.y - y) < r.height * 0.4);
        if (hit) {
          hit.x0 = Math.min(hit.x0, r.left - base.left);
          hit.x1 = Math.max(hit.x1, r.right - base.left);
        } else merged.push({ x0: r.left - base.left, x1: r.right - base.left, y });
      }
      setLines(merged);
      setSize({ w: base.width, h: base.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [text]);

  return (
    <span ref={wrap} className="relative block">
      <span ref={span}>{text}</span>
      {size.w ? (
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={size.w} height={size.h} aria-hidden>
          {lines.map((l, i) => (
            <g key={i}>
              <motion.path
                d={wobble(l.x0 - 6, l.x1 + 8, l.y, seed * 7 + i)}
                fill="none"
                stroke="#e5361f"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: reduce ? 1 : 0 }}
                variants={{ hit: { pathLength: 1 } }}
                transition={{ duration: 0.55, delay: 0.25 + i * 0.35, ease: [0.6, 0.05, 0.3, 1] }}
              />
              <motion.path
                d={wobble(l.x0 - 2, l.x1 + 4, l.y + 2.2, seed * 13 + i)}
                fill="none"
                stroke="#e5361f"
                strokeOpacity={0.55}
                strokeWidth={1.2}
                strokeLinecap="round"
                initial={{ pathLength: reduce ? 1 : 0 }}
                variants={{ hit: { pathLength: 1 } }}
                transition={{ duration: 0.5, delay: 0.42 + i * 0.35, ease: [0.6, 0.05, 0.3, 1] }}
              />
            </g>
          ))}
        </svg>
      ) : null}
    </span>
  );
}

export function Stories() {
  return (
    <section id="promises" className="paper-dark relative scroll-mt-16 pb-20 pt-16 text-paper lg:pb-24 lg:pt-20">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-10">
        <SheetStrip sheet="A-102" title="Contract clauses · plain English" short="Contract clauses" scale="1 CLAUSE = 1 PROMISE" dark />

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12">
          <h2 className="display text-[clamp(2.6rem,6vw,4.6rem)] lg:col-span-8">
            <Words text={"Every story you’ve\u00a0heard,"} />
            <br />
            <Words italic="answered in writing." delay={0.15} />
          </h2>
          <Rise delay={0.2} className="self-end text-[15.5px] leading-relaxed text-paper/70 lg:col-span-4">
            <p>We hear these from the people who call us afterwards. So we wrote the answers into our contract, where you can hold us to them.</p>
          </Rise>
        </div>

        <div className="mt-14 border-t border-paper/20 lg:mt-20">
          {SITE.stories.map((s, i) => (
            <motion.div
              key={s.clause}
              initial="rest"
              whileInView="hit"
              viewport={{ once: true, margin: "-22% 0px -22% 0px" }}
              className="grid gap-5 border-b border-paper/15 py-9 lg:grid-cols-12 lg:gap-10 lg:py-12"
            >
              <div className="lg:col-span-7">
                <p className="mono text-[10px] text-paper/45">Story 0{i + 1}</p>
                <blockquote className="display mt-3 text-[clamp(1.75rem,3.4vw,2.7rem)] italic leading-[1.1] text-paper/75">
                  <Strike text={`“${s.fear}”`} seed={i + 1} />
                </blockquote>
              </div>
              <motion.div
                variants={{ rest: { opacity: 0, y: 14 }, hit: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.6, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
                className="border-l border-fir-2/60 pl-5 lg:col-span-5 lg:mt-7"
              >
                <p className="mono text-[11px] font-medium tracking-[0.1em] text-fir-2">
                  {s.clause}
                  <Sample dark />
                </p>
                <p className="mt-2.5 text-[15.5px] leading-relaxed text-paper/85">
                  <Nums>{s.answer}</Nums>
                </p>
                <p className="mono mt-4 flex items-end gap-2 text-[9.5px] text-paper/40">
                  Initial here <span className="inline-block h-px w-20 bg-paper/30" />
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
