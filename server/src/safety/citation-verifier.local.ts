import {
  CitationVerification,
  CitationVerifier,
  CitationVerifyInput,
} from './citation-verifier.types';

/**
 * The default, dependency-free citation-support verifier — the local-first mode.
 *
 * A deliberately simple lexical-overlap heuristic (the same philosophy as the
 * citation-needed detector): it measures how many of the claim's content terms
 * appear in the source text, and flags a sentence that carries those terms with
 * the opposite polarity. It is **not** a strong checker — it's the no-tool
 * default; set `CITATION_VERIFIER=citevahti` to swap in the stronger backend
 * without changing this contract.
 *
 * Like every verifier here, it NEVER asserts truth: it reports `supported` /
 * `unsupported` / `contradicted` / `unverifiable`, not valid/invalid.
 */

// Common words carry no claim-specific meaning; dropping them keeps coverage honest.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'as', 'by', 'at', 'from', 'that', 'this', 'these', 'those', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'it', 'its', 'their', 'they', 'we', 'our', 'has',
  'have', 'had', 'not', 'no', 'than', 'then', 'into', 'over', 'about', 'can',
]);

// Negations that, alongside the claim's terms, suggest the OPPOSITE assertion.
const NEGATIONS = [
  'not', 'no', "n't", 'never', 'without', 'failed to', 'did not', 'does not',
  'was not', 'were not', 'no significant', 'no effect', 'unable to', 'cannot',
];

function contentTerms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length >= 3 && !STOPWORDS.has(t),
  );
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export class LocalCitationVerifier implements CitationVerifier {
  readonly name = 'local' as const;

  async verify({
    claim,
    sourceText,
  }: CitationVerifyInput): Promise<CitationVerification> {
    const claimTerms = Array.from(new Set(contentTerms(claim)));
    if (claimTerms.length === 0 || !sourceText.trim()) {
      return {
        support: 'unverifiable',
        verifier: 'local',
        detail: 'no content terms in the claim, or empty source text',
      };
    }

    const textTermSet = new Set(contentTerms(sourceText));
    const present = claimTerms.filter((t) => textTermSet.has(t));
    const coverage = Math.round((present.length / claimTerms.length) * 100) / 100;

    // Polarity guard: a sentence overlapping the claim's terms but carrying a
    // negation is surfaced as "may contradict" — a cue for the author, not a verdict.
    const lowerSentences = splitSentences(sourceText).map((s) => s.toLowerCase());
    let polarityCue: string | null = null;
    for (const s of lowerSentences) {
      const overlaps = claimTerms.some((t) => s.includes(t));
      if (!overlaps) continue;
      const cue = NEGATIONS.find((n) => s.includes(n));
      if (cue) {
        polarityCue = cue;
        break;
      }
    }

    if (polarityCue) {
      return { support: 'contradicted', coverage, polarityCue, verifier: 'local' };
    }
    return {
      support: coverage >= 0.5 ? 'supported' : 'unsupported',
      coverage,
      polarityCue: null,
      verifier: 'local',
    };
  }
}
