import { type ReactNode } from "react";
import { SITE } from "@/lib/site";

/**
 * The title strip every section opens with: a numbered sheet in the same drawing set.
 * A-101 … A-106, with a title, a scale and the firm's name threaded through.
 */
export function SheetStrip({
  sheet,
  title,
  short,
  scale = "NTS",
  dark,
  of = "07",
}: {
  sheet: string;
  title: string;
  /** Phone title (below 640px), so a long one never truncates mid-word. */
  short?: string;
  scale?: string;
  dark?: boolean;
  of?: string;
}) {
  const line = dark ? "border-paper/20" : "border-graphite/20";
  const sub = dark ? "text-paper/55" : "text-graphite/55";
  return (
    <div className={`mono grid grid-cols-[auto_1fr] border-y text-[10px] sm:grid-cols-[auto_1fr_auto_auto] ${line}`}>
      <div className={`flex items-center gap-2 whitespace-nowrap border-r px-3 py-2.5 sm:px-4 ${line}`}>
        <span className={sub}>Sheet</span>
        <span className="text-[13px] font-medium tracking-[0.08em]">{sheet}</span>
      </div>
      <div className="flex min-w-0 items-center px-3 py-2.5 sm:px-4">
        {short ? (
          <>
            <span className="truncate sm:hidden">{short}</span>
            <span className="hidden truncate sm:inline">{title}</span>
          </>
        ) : (
          <span className="truncate">{title}</span>
        )}
      </div>
      <div className={`hidden items-center gap-2 border-l px-4 py-2.5 sm:flex ${line}`}>
        <span className={sub}>Scale</span>
        <span>{scale}</span>
      </div>
      <div className={`hidden items-center gap-2 border-l px-4 py-2.5 sm:flex ${line}`}>
        <span className={sub}>{SITE.name}</span>
        <span>
          {sheet.slice(-1)} / {of}
        </span>
      </div>
    </div>
  );
}

/** Horizontal dimension string: hairline, slash ticks at both ends, label above. */
export function Dim({ label, className = "", children }: { label?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={`relative ${className}`}>
      {label ? <div className="mono mb-1 text-center text-[10px]">{label}</div> : null}
      <div className="relative h-3">
        <span className="absolute inset-x-0 top-1/2 h-px bg-current opacity-70" />
        <span className="tick" style={{ left: 0 }} />
        <span className="tick" style={{ left: "100%" }} />
        <span className="absolute left-0 top-0 h-full w-px bg-current opacity-50" />
        <span className="absolute right-0 top-0 h-full w-px bg-current opacity-50" />
      </div>
      {children}
    </div>
  );
}
