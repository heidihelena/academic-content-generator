/**
 * Canonical "no overclaim" phrase list — the single source of truth for absolute
 * efficacy/safety and research/brand overclaims across Vahtian surfaces. Used by
 * the medical-overclaiming reviewer and the carousel generator; the standalone
 * carousel builder embeds the same list (kept in sync from here).
 *
 * Entries are regex *sources* (matched case-insensitively, word-bounded by the
 * consumer) so the one list serves TypeScript and can be serialized for the
 * browser tool. The rule, in house terms: Vahtian *records*, it doesn't *prove*.
 */
export const OVERCLAIM_PATTERNS: readonly string[] = [
  // Medical efficacy / safety
  'cures?',
  'cured',
  'miracle',
  'guarantees?',
  'guaranteed?',
  '100%\\s+effective',
  'completely safe',
  'no side effects?',
  // Research / brand absolute claims
  'proves?',
  'proven',
  'fully verif\\w*',
  'eliminat\\w* bias',
  'removes? bias',
  'decides? (?:what is |the )?truth',
  '100% ?(?:accurate|correct|reliable)',
  'never wrong',
  'always correct',
  'ensures? (?:accuracy|correctness|truth)',
  'perfectly (?:accurate|reliable)',
];

/** A case-insensitive regex matching any overclaim phrase (global by default). */
export function overclaimRegex(flags = 'gi'): RegExp {
  return new RegExp('\\b(?:' + OVERCLAIM_PATTERNS.join('|') + ')\\b', flags);
}

/** The distinct overclaim phrases found in `text`, lowercased. */
export function findOverclaims(text: string): string[] {
  const hits: string[] = [];
  for (const match of (text ?? '').matchAll(overclaimRegex())) {
    const phrase = match[0].toLowerCase();
    if (!hits.includes(phrase)) hits.push(phrase);
  }
  return hits;
}
