"use client";

import { motion } from "framer-motion";
import { capitalize, numberWord } from "@/lib/format";
import { pexels, PHOTOS, SITE } from "@/lib/site";
import { Rise, Words } from "@/components/ui/Reveal";
import { Sample } from "@/components/ui/Sample";
import { SheetStrip } from "@/components/ui/Sheet";
import { Nums } from "@/components/ui/Nums";

const WEEKS = SITE.process.weeks;
const when = ([a, b]: readonly [number, number]) => (a === b ? `Week ${a}` : `Weeks ${a}–${b}`);

function Bar({ span, i }: { span: readonly [number, number]; i: number }) {
  const [a, b] = span;
  const left = (a / WEEKS) * 100;
  const width = ((b - a + 1) / WEEKS) * 100;
  const milestone = a === b;
  return (
    <div className="relative h-7">
      {/* week grid */}
      <div aria-hidden className="absolute inset-0 grid border-x border-graphite/25" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
        {Array.from({ length: WEEKS }, (_, k) => (
          <span key={k} className={`border-l first:border-l-0 ${k % 5 === 0 ? "border-graphite/25" : "border-graphite/10"}`} />
        ))}
      </div>
      <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-graphite/20" />
      {milestone ? (
        <motion.span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border border-graphite bg-fir"
          style={{ left: `calc(${left + width / 2}% - 7px)` }}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.45, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : (
        <motion.div
          className="absolute top-1/2 h-3 origin-left -translate-y-1/2 bg-graphite"
          style={{ left: `${left}%`, width: `${width}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {b - a > 6 ? (
            <span aria-hidden className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${b - a + 1}, 1fr)` }}>
              {Array.from({ length: b - a + 1 }, (_, k) => (
                <span key={k} className="relative">
                  <span className="absolute right-[18%] top-0 h-full w-[2px] bg-paper/70" />
                </span>
              ))}
            </span>
          ) : null}
        </motion.div>
      )}
    </div>
  );
}

export function Process() {
  return (
    <section id="process" className="paper relative scroll-mt-16 border-t border-graphite/15 pb-20 pt-16 lg:pb-24 lg:pt-20">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-10">
        <SheetStrip sheet="A-105" title="Schedule · every project, in this order" short="Schedule · in this order" scale="1 COL = 1 WEEK" />

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12">
          <h2 className="display text-[clamp(2.6rem,6vw,4.6rem)] lg:col-span-7">
            <Words text="How a project" />
            <br />
            <Words italic="actually runs." delay={0.12} />
          </h2>
          <Rise delay={0.2} className="self-end text-[15.5px] leading-relaxed text-graphite/75 lg:col-span-5">
            <p>
              {capitalize(numberWord(SITE.process.steps.length))} steps, in the same order, every time. A typical kitchen shown; your schedule is written into your contract before we start. <Sample />
            </p>
          </Rise>
        </div>

        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            {/* week ruler */}
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-6 md:grid">
              <span />
              <div className="mono relative h-5 text-[9px] text-graphite/50">
                {[0, 5, 10, 15, 20].map((w) => (
                  <span key={w} className="absolute -translate-x-1/2" style={{ left: `${((w + 0.5) / WEEKS) * 100}%` }}>
                    WK {w}
                  </span>
                ))}
              </div>
            </div>
            <ol className="border-t border-graphite/30">
              {SITE.process.steps.map((s, i) => (
                <li key={s.n} className="grid gap-3 border-b border-graphite/20 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-center md:gap-6">
                  <div>
                    <p className="mono text-[10px] text-graphite/50">
                      {s.n} · {when(s.span)}
                    </p>
                    <h3 className="display mt-1.5 text-[26px] leading-tight">{s.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-graphite/72">
                      <Nums>{s.body}</Nums>
                      <Sample />
                    </p>
                  </div>
                  <Bar span={s.span} i={i} />
                </li>
              ))}
            </ol>
            <p className="mono mt-3 flex items-center gap-2 text-[9.5px] text-graphite/55">
              <span className="inline-block h-2 w-6 bg-graphite" /> Work
              <span className="ml-3 inline-block h-2.5 w-2.5 rotate-45 border border-graphite bg-fir" /> Milestone
              <span className="ml-3 inline-block h-2.5 w-[2px] bg-graphite/60" /> Friday report
            </p>
          </div>

          <div className="lg:col-span-4">
            <Rise>
              <div className="relative border border-graphite/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pexels(PHOTOS.hands.id, 1200)} alt={PHOTOS.hands.alt} loading="lazy" className="aspect-[4/5] w-full object-cover object-[40%_50%]" />
                <span className="mono absolute left-0 top-0 bg-paper/90 px-2 py-1 text-[9px] text-graphite/70">Detail 1 / A-105 · Measure twice</span>
              </div>
            </Rise>
            <Rise delay={0.1} className="mt-8 border-l-2 border-graphite pl-5">
              <p className="display text-[28px] leading-[1.1]">
                We don&rsquo;t do free <em>three-hour estimates.</em>
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-graphite/75">
                Free estimates get paid for by the jobs that sign. We&rsquo;d rather charge for real design, credit every dollar back when you build, and spend our time on
                drawings you can actually use, even if you take them to someone else.
              </p>
            </Rise>
          </div>
        </div>
      </div>
    </section>
  );
}
