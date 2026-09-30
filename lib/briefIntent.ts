"use client";

/**
 * A-101 → A-106 hand-off. "Start a brief with your band" records which project tab
 * was open, and the brief picks it up: project filled in, that project's own A-101
 * tiers offered as the budget step.
 */
type Intent = { project?: string; n: number };

let intent: Intent = { n: 0 };
const listeners = new Set<() => void>();

export const briefIntent = {
  get: () => intent,
  getServer: () => intent,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** `project` is a SITE.costs key. */
  start(project: string) {
    intent = { project, n: intent.n + 1 };
    listeners.forEach((l) => l());
  },
};
