"use client";

import { useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True only after hydration; the static HTML is always rendered as the server saw it. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Reduced-motion preference, but only after hydration: the static export is rendered
 * without it, so reading it during hydration would mismatch the server HTML.
 */
export function useReduced() {
  const pref = useReducedMotion();
  return useHydrated() && !!pref;
}
