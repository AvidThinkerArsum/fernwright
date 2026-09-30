import { SITE } from "@/lib/site";

/** Tags a figure or claim as sample content when the concept banner is on. */
export function Sample({ force, className = "", dark }: { force?: boolean; className?: string; dark?: boolean }) {
  if (!SITE.showConceptBanner && !force) return null;
  return (
    <span
      className={`mono ml-1.5 inline-block translate-y-[-0.1em] rounded-[2px] border px-1 py-px align-middle text-[8.5px] leading-none tracking-[0.12em] ${
        dark ? "border-paper/40 text-paper/70" : "border-graphite/35 text-graphite/60"
      } ${className}`}
    >
      Sample
    </span>
  );
}

const concept = () => SITE.showConceptBanner;

/** Registration number, or "to be added" when this is an unofficial concept. */
export const registration = () => (concept() ? "TO BE ADDED" : SITE.registration);

/** A credential (status, insurance): the sample value, or "to be added" when this is an unofficial concept. */
export const credential = (v: string) => (concept() ? "TO BE ADDED" : v);

/** Contact email, or null in concept mode (the real address isn't known yet). */
export const email = () => (concept() ? null : SITE.email);

/** "Since 2011", or nothing in concept mode: a founding year is a claim. */
export const since = (prefix = "Since") => (concept() ? "" : `${prefix} ${SITE.founded}`);

/** "Nora or Sam", or a neutral stand-in when the real principals aren't known. */
export const owners = (fallback = "an owner") => (concept() ? fallback : SITE.principals.map((p) => p.name.split(" ")[0]).join(" or "));

/** "Nora Ellison (Design) · Sam Ruiz (Build)", or "to be added". */
export const principalsLine = () => (concept() ? "TO BE ADDED" : SITE.principals.map((p) => `${p.name} (${p.role})`).join(" · "));
