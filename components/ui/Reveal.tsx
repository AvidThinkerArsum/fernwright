"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Word-by-word rise. The parent span is what gets observed; the words start clipped
 * by overflow-hidden, so observing them directly would never fire.
 */
export function Words({ text, italic, delay = 0, className }: { text?: string; italic?: string; delay?: number; className?: string }) {
  const words = [
    ...(text ? text.split(" ") : []).map((w) => ({ w, em: false })),
    ...(italic ? italic.split(" ") : []).map((w) => ({ w, em: true })),
  ];
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-8% 0px" }}
    >
      {words.map(({ w, em }, i) => (
        <span key={i}>
          <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className="inline-block"
              variants={{ hidden: { y: "105%" }, show: { y: 0 } }}
              transition={{ duration: 0.75, delay: delay + i * 0.055, ease: EASE }}
            >
              {em ? <em>{w}</em> : w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.span>
  );
}

export function Rise({ children, delay = 0, className, y = 20 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ y, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
