import { Claim } from '../domain/academic';

/**
 * Citation-needed detector (issue #33).
 *
 * A deliberately simple, dependency-free heuristic pass that extracts the
 * empirical claims from a draft and flags those that assert a fact without a
 * supporting citation. It is the default, no-keys reviewer; an LLM-assisted
 * extractor can be swapped in later without changing the `Claim[]` contract.
 *
 * The detector errs toward surfacing claims for the author to confirm rather
 * than silently passing them — a missed citation is worse than a false prompt.
 */

/** Splits a body into sentence-ish units on terminal punctuation. */
function splitSentences(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Quantitative / statistical assertions: percentages, ratios, p-values, sample sizes. */
const QUANTITATIVE =
  /\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?(?:times|fold|x)\b|\bp\s?[<=>]\s?0?\.\d+|\bn\s?=\s?\d+/i;

/** "studies show", "research suggests", "the data demonstrate", … */
const EVIDENCE_VERB =
  /\b(?:studies|study|research|trials?|data|evidence|meta-?analyses?|analysis)\b[^.!?]{0,40}\b(?:show|shows|showed|suggest|suggests|demonstrate|demonstrates|found|find|finds|indicate|indicates|prove|proves|proven|confirm|confirms|reveal|reveals)\b/i;

/** Causal / effect language applied to an outcome. */
const CAUSAL =
  /\b(?:causes?|caused|leads?\s+to|results?\s+in|reduces?|increases?|prevents?|cures?|improves?|lowers?|raises?|boosts?)\b/i;

/** Markers that mean a citation is already present in the sentence. */
const CITATION_PRESENT =
  /\([A-Z][A-Za-z'-]+(?:\s+(?:et al\.?|and|&)\s+[A-Z][A-Za-z'-]+)?,?\s*\d{4}\)|\[\d+\]|\bdoi:|\bet al\.|https?:\/\//i;

/**
 * Classifies a single sentence. Returns a confidence in (0, 1] that the
 * sentence is an empirical claim, or 0 if it does not look like one.
 */
function claimConfidence(sentence: string): number {
  if (QUANTITATIVE.test(sentence)) return 0.9;
  if (EVIDENCE_VERB.test(sentence)) return 0.8;
  if (CAUSAL.test(sentence)) return 0.6;
  return 0;
}

/**
 * Extracts empirical claims from `body`. Each returned claim is marked
 * `needsCitation` unless the sentence already carries a citation marker.
 */
export function detectClaims(body: string): Claim[] {
  const claims: Claim[] = [];
  for (const sentence of splitSentences(body)) {
    const confidence = claimConfidence(sentence);
    if (confidence === 0) continue;
    claims.push({
      text: sentence,
      needsCitation: !CITATION_PRESENT.test(sentence),
      confidence,
    });
  }
  return claims;
}

/** Convenience: just the claims that still need a citation. */
export function claimsNeedingCitation(body: string): Claim[] {
  return detectClaims(body).filter((c) => c.needsCitation);
}
