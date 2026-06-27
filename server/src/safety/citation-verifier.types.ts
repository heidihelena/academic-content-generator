/**
 * Citation-*support* verifier (the `CITATION_VERIFIER=local|citevahti` seam).
 *
 * This is distinct from the citation-*needed* detector in `./citation.ts`:
 *   - `detectClaims` asks "did the author make a claim with NO citation?"
 *   - a `CitationVerifier` asks "the author cited something — does that source
 *     actually SUPPORT the claim?"
 * Together they are the full citation-integrity picture; this seam adds the
 * support half (issue: CiteVahti integration).
 *
 * The cardinal rule, inherited from CiteVahti: **never assert truth.** A verifier
 * returns a 4-state support signal, never a boolean valid/invalid. The author (or
 * the export gate) decides what to do with it; the verifier only reports what the
 * source text does and does not carry, and flags an opposite-polarity sentence as
 * an inspectable cue — never a verdict.
 */

/**
 * What the cited source does for the claim. Deliberately not a pass/fail:
 *  - `supported`     the source carries the claim's key terms (no polarity conflict)
 *  - `unsupported`   the source was readable but its terms don't cover the claim
 *  - `contradicted`  the source carries the terms with the OPPOSITE polarity — a flag
 *  - `unverifiable`  could not check (no source text, tool/CLI unavailable, timeout)
 */
export type CitationSupport =
  | 'supported'
  | 'unsupported'
  | 'contradicted'
  | 'unverifiable';

export interface CitationVerification {
  support: CitationSupport;
  /** 0..1 share of the claim's content terms found in the source, when computed. */
  coverage?: number;
  /** The negation word that flipped polarity, surfaced for the author — never hidden. */
  polarityCue?: string | null;
  /** Which backend produced this, for provenance/audit. */
  verifier: 'local' | 'citevahti';
  /** Short human-readable detail (e.g. why it was unverifiable). */
  detail?: string;
}

export interface CitationVerifyInput {
  /** The claim sentence to verify. */
  claim: string;
  /** The text of the cited source (abstract or full text) to check it against. */
  sourceText: string;
}

export interface CitationVerifier {
  readonly name: 'local' | 'citevahti';
  /**
   * Verify one claim against one source text. MUST resolve (never reject): a
   * verifier that can't run degrades to `unverifiable`, because "couldn't check"
   * must not look like "the citation is fine" — and must never crash export.
   */
  verify(input: CitationVerifyInput): Promise<CitationVerification>;
}

/** DI token for the configured verifier. */
export const CITATION_VERIFIER = Symbol('CITATION_VERIFIER');
