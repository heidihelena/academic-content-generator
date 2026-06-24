import { SafetyFinding } from '../domain/academic';
import { overclaimRegex } from './overclaim-terms';

/**
 * Medical overclaiming review (issue #32).
 *
 * A rule-based, dependency-free pass that scans a draft for unsafe medical
 * communication patterns and returns `SafetyFinding`s. It is the default
 * no-keys reviewer; an LLM-assisted pass can be layered on later without
 * changing the `SafetyFinding[]` contract.
 *
 * Severity model (see `domain/academic`): `block` findings must be resolved
 * before export, `warn` are advisory but prominent, `info` are gentle nudges.
 * The reviewer errs toward flagging — for patient/public content a false prompt
 * is cheaper than a missed overclaim.
 */

interface Rule {
  readonly pattern: RegExp;
  readonly category: SafetyFinding['category'];
  readonly severity: SafetyFinding['severity'];
  readonly message: string;
  readonly suggestion: string;
}

/** Each pattern carries the `g` flag so every occurrence yields its own finding. */
const RULES: readonly Rule[] = [
  {
    // Single source of truth for absolute claims (see overclaim-terms.ts).
    pattern: overclaimRegex(),
    category: 'overclaiming',
    severity: 'block',
    message: 'Absolute efficacy/safety claim — research findings are rarely certain.',
    suggestion: 'Soften to e.g. "may help" / "was associated with" and note the remaining uncertainty.',
  },
  {
    pattern: /\b(?:causes?|caused|proven to|makes you|leads? directly to)\b/gi,
    category: 'causal-language',
    severity: 'warn',
    message: 'Causal language — confirm the evidence supports causation, not just correlation.',
    suggestion: 'If the study is observational, use "was associated with" / "linked to".',
  },
  {
    pattern: /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|iu|units?)\b|\btake\s+\d+\b|\b\d+\s+times?\s+(?:a|per)\s+day\b/gi,
    category: 'dosage',
    severity: 'block',
    message: 'Specific dosage or self-treatment instruction — unsafe for patient/public content.',
    suggestion: 'Remove the dose and direct readers to their clinician or official guidance.',
  },
  {
    pattern: /\b(?:off-label|unapproved|not approved|alternative (?:cure|medicine|treatment)s?|detox(?:es|ify|ifies)?|boosts? (?:your )?immun\w*)\b/gi,
    category: 'unproven-treatment',
    severity: 'warn',
    message: 'Possible unproven or off-label treatment claim.',
    suggestion: 'State the approval/evidence status, or frame the treatment as investigational.',
  },
  {
    pattern: /\bmy patient\b|\bpatient (?:named|called)\s+[A-Z]\w*|\b\d{1,3}[- ]year[- ]old\b[^.]{0,40}\bnamed\b/gi,
    category: 'identifiable-patient',
    severity: 'block',
    message: 'Potentially identifiable patient detail.',
    suggestion: 'Remove identifying details or use a clearly de-identified, composite example.',
  },
];

/**
 * Scans `body` and returns one finding per rule match, ordered by position in
 * the text so callers can render them inline.
 */
export function reviewOverclaiming(body: string): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  for (const rule of RULES) {
    for (const match of body.matchAll(rule.pattern)) {
      const start = match.index ?? 0;
      findings.push({
        severity: rule.severity,
        category: rule.category,
        message: rule.message,
        suggestion: rule.suggestion,
        span: { start, end: start + match[0].length },
      });
    }
  }
  return findings.sort((a, b) => (a.span?.start ?? 0) - (b.span?.start ?? 0));
}
