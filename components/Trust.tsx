import { capitalize, numberWord } from "@/lib/format";
import { SITE, where } from "@/lib/site";
import { Rise, Words } from "@/components/ui/Reveal";
import { Sample, credential, owners, principalsLine, registration, since } from "@/components/ui/Sample";
import { SheetStrip } from "@/components/ui/Sheet";
import { Nums } from "@/components/ui/Nums";

export function Trust() {
  const rows = [
    { k: SITE.licenseLabel, v: registration(), big: true },
    { k: "Status", v: credential(SITE.credentials.status) },
    { k: "General liability", v: credential(SITE.credentials.liability) },
    { k: "In business since", v: since("").trim() || "TO BE ADDED" },
    { k: "Principals", v: principalsLine() },
  ];
  return (
    <section id="license" className="paper relative scroll-mt-16 border-t border-graphite/15 pb-20 pt-16 lg:pb-24 lg:pt-20">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-10">
        <SheetStrip sheet="A-104" title={`License, reviews, phone · ${where()}`} short={`License · ${where()}`} scale="VERIFIABLE" />

        <div className="mt-12 grid gap-14 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <h2 className="display text-[clamp(2.6rem,6vw,4.6rem)]">
              <Words text="Look us up." />
              <br />
              <Words italic="We’d rather you did." delay={0.12} />
            </h2>
            <Rise delay={0.15} className="mt-7 max-w-[30rem] text-[16px] leading-relaxed text-graphite/80">
              <p>
                {SITE.licensing.state} requires every contractor to be registered, bonded and insured with {SITE.licensing.body}. Our record is public. Check it before you call us, not
                after.
              </p>
            </Rise>

            <Rise delay={0.25} className="mt-10">
              <div className="border border-graphite/50">
                <div className="mono flex items-center justify-between border-b border-graphite/30 bg-graphite px-4 py-2 text-[10px] text-paper/80">
                  <span>{SITE.name}</span>
                  <span>
                    Credentials <Sample dark />
                  </span>
                </div>
                {rows.map((r) => (
                  <div key={r.k} className="grid grid-cols-1 border-b border-graphite/20 last:border-b-0 sm:grid-cols-[13rem_1fr]">
                    <p className="mono px-4 pt-3 text-[10px] text-graphite/55 sm:border-r sm:border-graphite/20 sm:py-3.5">{r.k}</p>
                    <p className={`mono px-4 pb-3 pt-1 sm:py-3 ${r.big ? "text-[clamp(1.35rem,3vw,1.9rem)] font-medium tracking-[0.08em]" : "text-[12px]"}`}>{r.v}</p>
                  </div>
                ))}
              </div>
              <a
                href={SITE.licenseLookup}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring mt-4 inline-flex h-12 items-center gap-2 rounded-[3px] bg-graphite px-5 text-[14px] font-medium text-paper transition-colors hover:bg-graphite-2"
              >
                Verify on {SITE.licensing.short} <span aria-hidden>↗</span>
              </a>
              <p className="mt-3 max-w-[28rem] text-[13px] text-graphite/60">
                Opens {SITE.licensing.state} {SITE.licensing.short}&rsquo;s own lookup. Search our name or registration number; you&rsquo;ll see bond, insurance and any complaints.
              </p>
            </Rise>
          </div>

          <div className="lg:col-span-6 lg:pl-6">
            <p className="mono text-[10px] text-graphite/55">{capitalize(numberWord(SITE.reviews.length))} clients, first names, their towns</p>
            <div className="mt-4 divide-y divide-graphite/20 border-y border-graphite/20">
              {SITE.reviews.map((r, i) => (
                <Rise key={r.name} delay={0.1 + i * 0.08} className="py-7">
                  <figure>
                    <blockquote className="display text-[clamp(1.35rem,2.2vw,1.7rem)] leading-[1.22] tracking-[-0.01em]">&ldquo;{r.quote}&rdquo;</blockquote>
                    <figcaption className="mono mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]">
                      <span className="font-medium">
                        {r.name} · {r.town}
                      </span>
                      <span className="text-graphite/55">{r.project}</span>
                      <span className="rounded-[2px] border border-graphite/35 px-1.5 py-0.5 text-[8.5px] tracking-[0.12em] text-graphite/60">Sample review</span>
                    </figcaption>
                  </figure>
                </Rise>
              ))}
            </div>
          </div>
        </div>

        <Rise className="mt-20 border-t border-graphite/30 pt-10 lg:mt-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="display text-[clamp(1.8rem,3.6vw,2.8rem)]">
                We answer <em>our own phone.</em>
              </p>
              <p className="mt-2 max-w-[34rem] text-[14.5px] leading-relaxed text-graphite/70">
                <Nums>{SITE.hours}</Nums>. {capitalize(owners())} picks up, not a call center. If we&rsquo;re up a ladder, we call back the same day. <Sample />
              </p>
            </div>
            <p className="mono text-[10px] text-graphite/55">
              <span className="lg:hidden">Tap to call</span>
              <span className="hidden lg:inline">Direct line</span>
            </p>
          </div>
          <a
            href={SITE.phoneHref}
            className="focus-ring group mt-6 block border-y border-graphite/30 py-4 lg:py-6"
            aria-label={`Call ${SITE.name} at ${SITE.phone}`}
          >
            <span className="mono block whitespace-nowrap text-[clamp(2.2rem,calc((100vw-3rem)/8.7),9rem)] font-medium leading-none tracking-[-0.03em] transition-colors group-hover:text-fir">
              {SITE.phone}
            </span>
          </a>
        </Rise>
      </div>
    </section>
  );
}

