import { Audience, SafetyFinding } from '../domain/academic';

/**
 * Patient-safe explainer mode (issue #34).
 *
 * For patient- and public-facing content, forskai applies stricter handling: a
 * standard non-advice disclaimer is added to the draft, and advisory findings
 * that matter most to lay readers are escalated so they gate export.
 */

/** Audiences that receive patient-safe treatment. */
export const PATIENT_FACING_AUDIENCES: readonly Audience[] = ['patients', 'public'];

export function isPatientFacing(audience: Audience): boolean {
  return PATIENT_FACING_AUDIENCES.includes(audience);
}

/** Standard "general information, not medical advice" framing. */
export const MEDICAL_DISCLAIMER =
  'This is general information, not medical advice. Talk to a qualified health professional about your situation.';

/**
 * Categories whose `warn` findings become `block` for patient-facing audiences:
 * unsupported causal language and unproven-treatment claims are the ones most
 * likely to mislead a lay reader.
 */
const ESCALATED_CATEGORIES: ReadonlySet<SafetyFinding['category']> = new Set([
  'causal-language',
  'unproven-treatment',
]);

/**
 * Returns findings with patient-facing escalation applied: for a patient-facing
 * audience, `warn` findings in the escalated categories are raised to `block`.
 * For any other audience the findings are returned unchanged.
 */
export function escalateForAudience(
  findings: SafetyFinding[],
  audience: Audience,
): SafetyFinding[] {
  if (!isPatientFacing(audience)) return findings;
  return findings.map((finding) =>
    finding.severity === 'warn' && ESCALATED_CATEGORIES.has(finding.category)
      ? { ...finding, severity: 'block' as const }
      : finding,
  );
}
