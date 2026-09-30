"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Framer honours the visitor's reduced-motion setting for every transform animation. */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
