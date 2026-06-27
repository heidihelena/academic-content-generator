import { SafetyFinding } from '../domain/academic';
import { CitationVerification } from './citation-verifier.types';

/**
 * Maps a citation-support verification onto the safety model so it can feed the
 * same `block`-gates-export logic as the medical reviewers.
 *
 * The mapping preserves the never-a-verdict rule:
 *   - `contradicted` → `block`  (the source appears to say the opposite — resolve before export)
 *   - `unsupported`  → `warn`   (the source doesn't carry the claim's terms — confirm the citation)
 *   - `unverifiable` → `info`   (couldn't check — verify manually; never blocks on a tool gap)
 *   - `supported`    → no finding (nothing to raise — but NOT a "✓ verified" stamp)
 *
 * Note `supported` returns `null`, not a positive finding: an integrating reviewer
 * surfaces problems, it does not assert a citation is correct.
 */
export function citationFinding(
  v: CitationVerification,
  claimText?: string,
): SafetyFinding | null {
  const where = claimText ? ` for: "${truncate(claimText)}"` : '';
  switch (v.support) {
    case 'contradicted':
      return {
        severity: 'block',
        category: 'citation-unsupported',
        message:
          `The cited source appears to contradict the claim${where}` +
          (v.polarityCue ? ` (negation cue: "${v.polarityCue}")` : '') +
          ` — checked by ${v.verifier}. Confirm the citation actually supports it.`,
        suggestion: 'Re-read the source, or cite one that supports the claim.',
      };
    case 'unsupported':
      return {
        severity: 'warn',
        category: 'citation-unsupported',
        message:
          `The cited source does not clearly support the claim${where}` +
          (typeof v.coverage === 'number' ? ` (term coverage ${v.coverage})` : '') +
          ` — checked by ${v.verifier}.`,
        suggestion: 'Confirm this is the right citation for this claim.',
      };
    case 'unverifiable':
      return {
        severity: 'info',
        category: 'citation-unsupported',
        message:
          `Citation support could not be checked${where}` +
          (v.detail ? ` (${v.detail})` : '') + '. Verify it manually.',
      };
    case 'supported':
      return null; // nothing to raise — and deliberately not a "verified" stamp
  }
}

function truncate(s: string, max = 80): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
