/**
 * forskai mark — central dot (source/claim) inside a violet review ring with an
 * exit gap, then teal broadcast arcs. The signal proceeds only after it clears
 * the review gate. See brand/ for the full system.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="forskai">
      <path d="M42.9 37.1 A12 12 0 1 1 42.9 26.9" stroke="rgb(var(--verify-500))" strokeWidth="3" strokeLinecap="round" />
      <path d="M42.9 16.4 A19 19 0 0 1 42.9 47.6" stroke="rgb(var(--brand-500))" strokeWidth="3" strokeLinecap="round" />
      <path d="M50.4 13.6 A26 26 0 0 1 50.4 50.4" stroke="rgb(var(--brand-500))" strokeWidth="3" strokeLinecap="round" opacity={0.5} />
      <circle cx="32" cy="32" r="5" fill="rgb(var(--slate-100))" />
    </svg>
  );
}

/** Wordmark: forskai · Studio. forskai = house brand, Studio = product descriptor. */
export function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={26} />
      <span className="text-base tracking-tight">
        <span className="font-semibold text-slate-100">forskai</span>
        <span className="font-normal text-slate-600">&nbsp;·&nbsp;</span>
        <span className="font-normal text-slate-400">Studio</span>
      </span>
    </span>
  );
}
