/** A number never ends on the sentence's own punctuation: "$12,500," keeps its comma outside. */
const NUM = String.raw`\$?\d(?:[\d,.:]*\d)?`;
const PATTERN = new RegExp(`(${NUM}(?:[–-]${NUM})?(?:\\s?[kK]\\b|%)?)`, "g");

/** Sets every number inside running copy in Plex Mono, per the type rules. */
export function Nums({ children }: { children: string }) {
  const parts = children.split(PATTERN);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="mono text-[0.88em] tracking-[0.01em]">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}
