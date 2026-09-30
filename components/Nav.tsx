"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { SITE } from "@/lib/site";
import { Mark } from "@/components/hero/TitleBlock";

const LINKS = [
  { href: "#costs", sheet: "A-101", label: "Costs" },
  { href: "#promises", sheet: "A-102", label: "In writing" },
  { href: "#work", sheet: "A-103", label: "Work" },
  { href: "#license", sheet: "A-104", label: "License" },
  { href: "#process", sheet: "A-105", label: "Process" },
];

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {SITE.showConceptBanner ? (
        <div className="mono flex h-[26px] items-center justify-center overflow-hidden whitespace-nowrap bg-graphite px-3 text-center text-[8px] tracking-[0.04em] text-paper/85 sm:text-[9.5px] sm:tracking-[0.1em]">
          <span className="truncate">Unofficial concept for {SITE.name}, not affiliated</span>
        </div>
      ) : null}
      <nav className="flex h-[52px] items-center justify-between border-b border-graphite/20 bg-paper/92 px-4 backdrop-blur-md lg:px-6">
        <a href="#top" className="focus-ring flex items-center gap-2.5" aria-label={`${SITE.name}, back to top`}>
          <Mark className="h-7 w-7 text-graphite" />
          <span className="display text-[21px] leading-none tracking-[-0.01em]">{SITE.shortName}</span>
          <span className="mono hidden text-[9px] text-graphite/55 sm:inline">Design-build · {SITE.town}</span>
        </a>
        <ul className="hidden items-center gap-6 xl:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="focus-ring mono group flex items-baseline gap-1.5 text-[10.5px] text-graphite/75 transition-colors hover:text-graphite">
                <span className="text-graphite/40 group-hover:text-fir">{l.sheet}</span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 lg:gap-4">
          <a href={SITE.phoneHref} className="focus-ring mono hidden text-[11.5px] font-medium tracking-[0.04em] md:block">
            {SITE.phone}
          </a>
          <a
            href="#brief"
            className="focus-ring inline-flex h-9 items-center rounded-[3px] bg-graphite px-3.5 text-[13px] font-medium text-paper transition-colors hover:bg-graphite-2"
          >
            Start a brief
          </a>
        </div>
      </nav>
    </header>
  );
}

/** Phone: sticky Call / Start a brief bar, once the hero's pin has released (it would cover the sheet). */
export function MobileBar() {
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => {
    const hero = document.getElementById("top");
    const release = hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight : window.innerHeight * 0.6;
    const s = v > Math.max(window.innerHeight * 0.6, release - 8);
    if (s !== show) setShow(s);
  });
  return (
    <motion.div
      initial={false}
      animate={{ y: show ? 0 : 96 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 gap-2 border-t border-graphite/20 bg-paper/95 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
    >
      <a href={SITE.phoneHref} className="focus-ring flex h-12 items-center justify-center gap-2 rounded-[3px] border border-graphite/50 text-[15px] font-medium">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
        Call us
      </a>
      <a href="#brief" className="focus-ring flex h-12 items-center justify-center rounded-[3px] bg-graphite text-[15px] font-medium text-paper">
        Start a brief
      </a>
    </motion.div>
  );
}
