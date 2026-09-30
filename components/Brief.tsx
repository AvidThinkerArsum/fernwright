"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";
import { capitalize, kilo, moneyRange, pad2 } from "@/lib/format";
import { briefIntent } from "@/lib/briefIntent";
import { SITE, YEAR, where } from "@/lib/site";
import { Words } from "@/components/ui/Reveal";
import { Sample, owners } from "@/components/ui/Sample";
import { SheetStrip } from "@/components/ui/Sheet";
import { Nums } from "@/components/ui/Nums";

type Key = "project" | "town" | "budget" | "timing" | "heard";
type Option = { v: string; main: string; sub?: string };

const UNDER = `Under ${kilo(SITE.floor)}`;
const opt = (v: string): Option => ({ v, main: v });

/** Budget choices: the chosen project's own A-101 tiers, or generic bands for anything else. */
function budgetOptions(projectLabel?: string): Option[] {
  const cost = SITE.costs.find((c) => c.label === projectLabel);
  const bands = cost
    ? cost.tiers.map((t) => ({ v: `${t.name} · ${moneyRange(t.lo, t.hi)}`, main: t.name, sub: `${moneyRange(t.lo, t.hi)} · ${t.weeks} wks` }))
    : SITE.briefOptions.budget.map(opt);
  return [opt(UNDER), ...bands, opt(SITE.briefOptions.notSure)];
}

type Step = { key: Key | "contact"; label: string; q: string; options?: Option[] };

const steps = (project?: string): Step[] => [
  { key: "project", label: "Project", q: "What are we building?", options: [...SITE.costs.map((c) => opt(c.label)), opt(SITE.briefOptions.other)] },
  { key: "town", label: "Town", q: "Where’s the house?", options: [...SITE.townsServed, "Somewhere else"].map(opt) },
  {
    key: "budget",
    label: "Budget",
    q: SITE.costs.some((c) => c.label === project) ? `Which ${project!.charAt(0).toLowerCase() + project!.slice(1)} band are you in?` : "Which budget band are you in?",
    options: budgetOptions(project),
  },
  { key: "timing", label: "Timing", q: "When would you like to start?", options: SITE.briefOptions.timing.map(opt) },
  { key: "heard", label: "Heard via", q: "How did you hear about us?", options: SITE.briefOptions.heard.map(opt) },
  { key: "contact", label: "Contact", q: "Who should we call?" },
];

const EASE = [0.22, 1, 0.36, 1] as const;
const initials =
  (SITE as { initials?: string }).initials ??
  SITE.shortName
    .split(/[\s&-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 2)
    .padEnd(2, SITE.shortName[1]?.toUpperCase() ?? "X");
const BRIEF_NO = `${initials}-${String(YEAR).slice(-2)}-${SITE.phone.replace(/\D/g, "").slice(-4)}`;

export function Brief() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [a, setA] = useState<Partial<Record<Key, string>>>({});
  const [contact, setContact] = useState({ name: "", reach: "", note: "" });
  const [sent, setSent] = useState(false);

  // "Start a brief with your band" on A-101: arrive with the project already chosen.
  const intent = useSyncExternalStore(briefIntent.subscribe, briefIntent.get, briefIntent.getServer);
  const [seen, setSeen] = useState(intent.n);
  if (intent.n !== seen) {
    setSeen(intent.n);
    const label = SITE.costs.find((c) => c.key === intent.project)?.label;
    if (label) {
      setSent(false);
      setA((prev) => ({ ...prev, project: label, budget: prev.project === label ? prev.budget : undefined }));
      setDir(1);
      setStep(a.town ? 2 : 1);
    }
  }

  const STEPS = steps(a.project);
  const s = STEPS[step];
  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  };
  const pick = (k: Key, v: string) => {
    setA((prev) => ({ ...prev, [k]: v, ...(k === "project" && prev.project !== v ? { budget: undefined } : {}) }));
    if (!(k === "budget" && v === UNDER)) setTimeout(() => go(step + 1), 260);
  };
  const canSend = contact.name.trim().length > 1 && contact.reach.trim().length > 4;
  const under = a.budget === UNDER;

  const rows: { k: string; v?: string }[] = [
    { k: "Project", v: a.project },
    { k: "Town", v: a.town ? (a.town === "Somewhere else" ? "Outside our area" : where(a.town)) : undefined },
    { k: "Budget", v: a.budget },
    { k: "Timing", v: a.timing },
    { k: "Heard via", v: a.heard },
    { k: "Contact", v: contact.name ? `${contact.name}${contact.reach ? " · " + contact.reach : ""}` : undefined },
  ];
  const filled = rows.filter((r) => r.v);

  return (
    <section id="brief" className="paper relative scroll-mt-16 border-t border-graphite/15 pb-24 pt-16 lg:pb-28 lg:pt-20">
      <div className="mx-auto max-w-[1320px] px-4 lg:px-10">
        <SheetStrip sheet="A-106" title="Project brief · goes to us only" short="Project brief · to us only" scale="6 QUESTIONS" />

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12">
          <h2 className="display text-[clamp(2.6rem,6vw,4.6rem)] lg:col-span-7">
            <Words text="Start a brief." />
            <br />
            <Words italic={"Two minutes, six\u00a0questions."} delay={0.12} />
          </h2>
          <p className="self-end text-[15.5px] leading-relaxed text-graphite/75 lg:col-span-5">
            This comes to us directly, not to a lead marketplace or five other contractors. {capitalize(owners())} reads every one and calls you back within a business day.
            <Sample />
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12">
          {/* The live title block. On a phone the compact brief above the question does this job, so the full block waits for the send. */}
          <aside className={`order-2 min-w-0 lg:col-span-5 ${sent ? "" : "hidden lg:block"}`}>
            <div className="relative border-[1.5px] border-graphite/80 p-[3px] lg:sticky lg:top-24">
              <div className="border border-graphite/35">
                <div className="mono flex items-center justify-between border-b border-graphite/35 px-4 py-2.5 text-[10px]">
                  <span className="font-medium tracking-[0.12em]">Project brief</span>
                  <span className="text-graphite/55">No. {BRIEF_NO}</span>
                </div>
                {rows.map((r) => (
                  <div key={r.k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] border-b border-graphite/20 last:border-b-0">
                    <span className="mono border-r border-graphite/20 px-4 py-3 text-[9.5px] text-graphite/55">{r.k}</span>
                    <span className="mono min-h-[2.6rem] break-words px-4 py-3 text-[11.5px] font-medium">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={r.v ?? "empty"}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                          className={r.v ? "" : "text-graphite/25"}
                        >
                          {r.v ?? "———"}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                ))}
                <div className="mono grid grid-cols-2 border-t border-graphite/35 text-[9px] text-graphite/60">
                  <span className="border-r border-graphite/20 px-4 py-2.5">To: {SITE.name}</span>
                  <span className="px-4 py-2.5">Shared with: nobody else</span>
                </div>
              </div>
              <AnimatePresence>
                {sent ? (
                  <motion.div
                    initial={{ scale: 1.8, rotate: -14, opacity: 0 }}
                    animate={{ scale: 1, rotate: -6, opacity: 0.92 }}
                    transition={{ type: "spring", stiffness: 520, damping: 24 }}
                    className="mono pointer-events-none absolute -bottom-5 right-3 border-[3px] border-fir bg-paper/70 px-3 py-1.5 text-center text-fir"
                  >
                    <span className="block text-[20px] font-bold tracking-[0.14em]">Received</span>
                    <span className="block text-[8.5px] tracking-[0.14em]">Call-back within 1 business day</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </aside>

          {/* The steps */}
          <div className="order-1 min-w-0 lg:col-span-7">
            {sent ? (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="border border-graphite/30 p-6 lg:p-10">
                <p className="mono text-[10px] text-fir">Brief received</p>
                <p className="display mt-3 text-[clamp(2rem,4vw,3rem)] leading-[1.05]">
                  Thanks, {contact.name.split(" ")[0] || "neighbor"}. <em>We’ll call you.</em>
                </p>
                <p className="mt-4 max-w-[34rem] text-[15px] leading-relaxed text-graphite/75">
                  {capitalize(owners("one of the owners"))} will call within one business day, with a straight answer on budget in the first five minutes.
                </p>
                <p className="mono mt-6 text-[10px] text-graphite/50">Demo only: nothing was sent anywhere.</p>
                <button
                  onClick={() => {
                    setSent(false);
                    setA({});
                    setContact({ name: "", reach: "", note: "" });
                    go(0);
                  }}
                  className="focus-ring mono mt-6 border-b border-graphite/50 pb-0.5 text-[10.5px]"
                >
                  Start another brief
                </button>
              </motion.div>
            ) : (
              <div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="mono min-w-0 truncate text-[10px] text-graphite/60">
                    Step {pad2(step + 1)} / {pad2(STEPS.length)} · {s.label}
                  </p>
                  {step > 0 ? (
                    <button onClick={() => go(step - 1)} className="focus-ring mono shrink-0 text-[10px] text-graphite/70 underline decoration-graphite/30 underline-offset-4">
                      ← Back
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-6 gap-1">
                  {STEPS.map((x, i) => (
                    <button
                      key={x.key}
                      aria-label={`Go to ${x.label}`}
                      onClick={() => (i <= step || a[STEPS[i - 1]?.key as Key] ? go(i) : null)}
                      className={`h-1.5 transition-colors ${i < step ? "bg-graphite" : i === step ? "bg-fir" : "bg-graphite/15"}`}
                    />
                  ))}
                </div>

                {/* Phone: the brief fills in right above the question, where you can watch it happen. */}
                {filled.length ? (
                  <div className="mt-4 border border-graphite/45 lg:hidden">
                    <p className="mono flex justify-between border-b border-graphite/20 px-3 py-1.5 text-[8.5px] text-graphite/55">
                      <span>Project brief</span>
                      <span>No. {BRIEF_NO}</span>
                    </p>
                    <dl className="mono grid grid-cols-[4.6rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-3 py-2 text-[10px]">
                      {filled.map((r) => (
                        <div key={r.k} className="contents">
                          <dt className="text-graphite/50">{r.k}</dt>
                          <dd className="truncate font-medium">{r.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                <div className="relative mt-8 min-h-[25rem] overflow-hidden">
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    <motion.div
                      key={s.key}
                      custom={dir}
                      initial={{ opacity: 0, x: dir * 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: dir * -40 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      <h3 className="display text-[clamp(1.9rem,3.6vw,2.6rem)] leading-tight">{s.q}</h3>
                      {s.options ? (
                        <div className={`mt-6 grid gap-2 ${s.options.length > 7 ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                          {s.options.map((o, i) => {
                            const on = a[s.key as Key] === o.v;
                            return (
                              <button
                                key={o.v}
                                onClick={() => pick(s.key as Key, o.v)}
                                className={`focus-ring flex min-h-[60px] min-w-0 items-center gap-3 rounded-[3px] border px-4 py-3 text-left text-[16px] font-medium transition-colors ${
                                  on ? "border-graphite bg-graphite text-paper" : "border-graphite/30 hover:border-graphite hover:bg-graphite/5"
                                }`}
                              >
                                <span className={`mono text-[10px] ${on ? "text-paper/60" : "text-graphite/40"}`}>{String.fromCharCode(65 + i)}</span>
                                <span className="min-w-0">
                                  {/* Every option is set the same way: body type, with any figure in mono, as in running copy. */}
                                  <span className="block">
                                    <Nums>{o.main}</Nums>
                                  </span>
                                  {o.sub ? <span className={`mono mt-0.5 block text-[11.5px] font-normal ${on ? "text-paper/70" : "text-graphite/60"}`}>{o.sub}</span> : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <form
                          className="mt-6 grid min-w-0 gap-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (canSend) setSent(true);
                          }}
                        >
                          <label className="block min-w-0">
                            <span className="mono text-[9.5px] text-graphite/60">Your name</span>
                            <input
                              value={contact.name}
                              onChange={(e) => setContact({ ...contact, name: e.target.value })}
                              autoComplete="name"
                              className="focus-ring mt-1 h-14 w-full rounded-[3px] border border-graphite/35 bg-paper px-4 text-[16px] outline-none focus:border-graphite"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mono text-[9.5px] text-graphite/60">Phone or email</span>
                            <input
                              value={contact.reach}
                              onChange={(e) => setContact({ ...contact, reach: e.target.value })}
                              autoComplete="tel"
                              className="focus-ring mt-1 h-14 w-full rounded-[3px] border border-graphite/35 bg-paper px-4 text-[16px] outline-none focus:border-graphite"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mono text-[9.5px] text-graphite/60">Anything we should know? (optional)</span>
                            <textarea
                              value={contact.note}
                              onChange={(e) => setContact({ ...contact, note: e.target.value })}
                              rows={3}
                              className="focus-ring mt-1 w-full rounded-[3px] border border-graphite/35 bg-paper px-4 py-3 text-[16px] outline-none focus:border-graphite"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={!canSend}
                            className="focus-ring mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-[3px] bg-graphite px-6 text-[16px] font-medium text-paper transition-opacity disabled:opacity-35"
                          >
                            Send the brief to {SITE.shortName} <span aria-hidden>→</span>
                          </button>
                          <p className="text-[12.5px] text-graphite/55">Only we see this. No marketplace, no shared leads, no newsletter.</p>
                        </form>
                      )}
                      {s.key === "budget" && under ? (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border-l-2 border-fir pl-4">
                          <p className="text-[15px] leading-relaxed">
                            Honest answer: under <span className="mono text-[0.86em]">{kilo(SITE.floor)}</span> we’re probably not your fit. Send the brief anyway and we’ll reply with
                            two firms who are.
                          </p>
                          <button onClick={() => go(step + 1)} className="focus-ring mono mt-3 border-b border-graphite/60 pb-0.5 text-[10.5px]">
                            Continue →
                          </button>
                        </motion.div>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

