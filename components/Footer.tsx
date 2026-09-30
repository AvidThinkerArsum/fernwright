import { pexels, PHOTOS, SITE, where, YEAR } from "@/lib/site";
import { Mark } from "@/components/hero/TitleBlock";
import { Words } from "@/components/ui/Reveal";
import { email, registration, since } from "@/components/ui/Sample";

/** The note in the last title block: what this page is, stated plainly. */
function note() {
  if (SITE.showConceptBanner)
    return `Unofficial concept prepared for ${SITE.name}. Not affiliated with or endorsed by ${SITE.name}. Every figure, review, license number and credential is sample content.`;
  if (SITE.fictional) return `${SITE.shortName} is a fictional business; this page is a demonstration. Every figure, review, license number and credential on it is sample content.`;
  return "Ranges on this page are typical, not a quote. Your fixed price comes after the design phase, in writing.";
}

/** Only the photographs this page actually shows, one line per photographer. */
function credits() {
  const shown = [SITE.hero.photo, ...SITE.projects.map((p) => p.photo), PHOTOS.hands, PHOTOS.dusk];
  const byName = new Map<string, (typeof shown)[number]>();
  for (const p of shown) if (!byName.has(p.credit)) byName.set(p.credit, p);
  return [...byName.values()];
}

export function Footer() {
  const shown = credits();
  const mail = email();
  const est = since();
  return (
    <footer className="relative bg-graphite text-paper">
      <div className="relative h-[80svh] min-h-[560px] overflow-hidden lg:h-[88vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pexels(PHOTOS.dusk.id, 2400)} alt={PHOTOS.dusk.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[60%_38%] lg:object-[50%_36%]" />
        {/* Dusk settles from the lawn up; the house and its lit windows stay clear. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(0deg,rgba(18,20,22,0.92)_0%,rgba(18,20,22,0.72)_26%,rgba(18,20,22,0.18)_52%,rgba(18,20,22,0)_62%),linear-gradient(180deg,rgba(18,20,22,0.5)_0%,rgba(18,20,22,0)_16%)] lg:bg-[linear-gradient(0deg,rgba(18,20,22,0.9)_0%,rgba(18,20,22,0.55)_30%,rgba(18,20,22,0)_56%),radial-gradient(ellipse_62%_68%_at_0%_100%,rgba(18,20,22,0.6)_0%,rgba(18,20,22,0)_100%),linear-gradient(180deg,rgba(18,20,22,0.5)_0%,rgba(18,20,22,0)_16%)]"
        />
        <div className="absolute inset-x-0 bottom-0 mx-auto grid max-w-[1320px] items-end gap-7 px-4 pb-10 lg:grid-cols-[1fr_auto] lg:gap-10 lg:px-10 lg:pb-14">
          <div>
            <p className="mono text-[10px] font-medium text-paper/95 [text-shadow:0_1px_12px_rgba(0,0,0,0.75),0_0_2px_rgba(0,0,0,0.5)]">
              Sheet A-107 · {SITE.name} · {where()}
            </p>
            <h2 className="display mt-4 text-[clamp(3rem,8vw,6.6rem)] text-paper">
              <Words text="Your house," />
              <br />
              <Words italic="as built." delay={0.15} />
            </h2>
            <p className="mt-5 max-w-[26rem] text-[15px] leading-relaxed text-paper/85">
              Drawn, priced and built by the same people. The drawing and the invoice match, and you keep both.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href="#brief" className="focus-ring inline-flex h-12 items-center rounded-[3px] bg-paper px-5 text-[14px] font-medium text-graphite transition-colors hover:bg-white">
              Start a brief
            </a>
            <a href={SITE.phoneHref} className="focus-ring mono inline-flex h-12 items-center rounded-[3px] border border-paper/60 px-5 text-[13px] font-medium text-paper transition-colors hover:bg-paper/10">
              {SITE.phone}
            </a>
          </div>
        </div>
      </div>

      {/* The last title block in the set */}
      <div className="paper text-graphite">
        <div className="mx-auto max-w-[1320px] px-4 py-10 pb-28 lg:px-10 lg:py-14">
          <div className="border-[1.5px] border-graphite/80 p-[3px]">
            <div className="grid border border-graphite/35 md:grid-cols-12">
              <div className="flex items-center gap-3 border-b border-graphite/25 p-5 md:col-span-4 md:border-b-0 md:border-r">
                <Mark className="h-10 w-10 shrink-0" />
                <div>
                  <p className="display text-[26px] leading-none">{SITE.shortName}</p>
                  <p className="mono mt-1.5 text-[9.5px] text-graphite/60">
                    Design-build · {where()}
                    {est ? ` · ${est}` : ""}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 border-b border-graphite/25 sm:grid-cols-2 md:col-span-5 md:border-b-0 md:border-r">
                <div className="border-b border-graphite/20 p-5 sm:border-b-0 sm:border-r">
                  <p className="mono text-[9px] text-graphite/55">Phone</p>
                  <a href={SITE.phoneHref} className="focus-ring mono mt-1 block text-[13px] font-medium">
                    {SITE.phone}
                  </a>
                  <p className="mono mt-3 text-[9px] text-graphite/55">Email</p>
                  {mail ? (
                    <a href={`mailto:${mail}`} className="focus-ring mt-1 block break-all text-[13px]">
                      {mail}
                    </a>
                  ) : (
                    <p className="mono mt-1 text-[12px] font-medium tracking-[0.08em]">To be added</p>
                  )}
                </div>
                <div className="p-5">
                  <p className="mono text-[9px] text-graphite/55">{SITE.licenseLabel}</p>
                  <p className="mono mt-1 text-[13px] font-medium tracking-[0.08em]">{registration()}</p>
                  <a href={SITE.licenseLookup} target="_blank" rel="noopener noreferrer" className="focus-ring mono mt-3 inline-block border-b border-graphite/40 text-[10px]">
                    Verify on {SITE.licensing.short} ↗
                  </a>
                </div>
              </div>
              <div className="flex flex-col justify-between p-5 md:col-span-3">
                <p className="mono text-[9px] text-graphite/55">Sheet</p>
                <p className="mono text-[34px] font-medium leading-none">A-107</p>
                <p className="mono mt-2 text-[9px] text-graphite/55">7 of 7 · Issued for your review</p>
              </div>

              <div className="border-t border-graphite/25 p-5 md:col-span-4 md:border-r">
                <p className="mono text-[9px] text-graphite/55">Towns served</p>
                <p className="mt-2 text-[14px] leading-relaxed">{SITE.townsServed.join(" · ")}</p>
              </div>
              <div className="border-t border-graphite/25 p-5 md:col-span-5 md:border-r">
                <p className="mono text-[9px] text-graphite/55">Photographs · Pexels</p>
                <ul className="mt-2 grid gap-x-4 gap-y-1 text-[12px] leading-snug text-graphite/75 sm:grid-cols-2">
                  {shown.map((c) => (
                    <li key={c.id}>
                      <a href={`https://www.pexels.com/photo/${c.id}/`} target="_blank" rel="noopener noreferrer" className="focus-ring hover:text-graphite hover:underline">
                        {c.credit}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-graphite/25 p-5 md:col-span-3">
                <p className="mono text-[9px] text-graphite/55">Note</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-graphite/75">{note()}</p>
              </div>
            </div>
          </div>
          <p className="mono mt-4 flex flex-wrap justify-between gap-2 text-[9px] text-graphite/45">
            <span>Drawn by {SITE.shortName} · Checked by the lead carpenter</span>
            <span>© {YEAR} · Not for construction</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
