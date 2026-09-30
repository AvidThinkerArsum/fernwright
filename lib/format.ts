export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/** Invoiced minus planned: "$0", "+$1,200" or "−$800". */
export const variance = (n: number) => (Math.round(n) === 0 ? "$0" : `${n > 0 ? "+" : "−"}${money(Math.abs(n))}`);

/** 4 → "four", for counts that sit in running copy. Falls back to digits past twelve. */
export const numberWord = (n: number) =>
  ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][n] ?? String(n);

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 95000,150000 → "$95–150K" */
export const moneyRange = (lo: number, hi: number) => `$${Math.round(lo / 1000)}–${Math.round(hi / 1000)}K`;

export const kilo = (n: number) => `$${Math.round(n / 1000)}K`;

/** 50 → 4′-2″ (real primes). */
export const feetInches = (inches: number) => {
  const t = Math.max(0, Math.round(inches));
  return `${Math.floor(t / 12)}′-${t % 12}″`;
};

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const r2 = (v: number) => Math.round(v * 100) / 100;
