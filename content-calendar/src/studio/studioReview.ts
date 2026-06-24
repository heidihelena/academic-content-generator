import type {
  Claim,
  ReviewState,
  SafetyFinding,
  StudioAudience,
} from './studioTypes';

/**
 * Client-side claim + medical-safety review for the Draft Studio.
 *
 * This mirrors the server's safety policy (`server/src/safety/*`) so the flow
 * works offline; the server is authoritative when the API is wired. Like the
 * server, it errs toward flagging — a false prompt is cheaper than a missed
 * overclaim for patient/public content.
 */

/** Audiences that receive patient-safe treatment. */
export const PATIENT_FACING_AUDIENCES: readonly StudioAudience[] = ['patients', 'public'];

export function isPatientFacing(audience: StudioAudience): boolean {
  return PATIENT_FACING_AUDIENCES.includes(audience);
}

/** Standard "general information, not medical advice" framing. */
export const MEDICAL_DISCLAIMER =
  'This is general information, not medical advice. Talk to a qualified health professional about your situation.';

export function isCleared(findings: readonly SafetyFinding[]): boolean {
  return !findings.some((f) => f.severity === 'block');
}

// --- Overclaiming rules (ported from server/src/safety/overclaiming.ts) ------

interface Rule {
  pattern: RegExp;
  category: SafetyFinding['category'];
  severity: SafetyFinding['severity'];
  message: string;
}

const RULES: readonly Rule[] = [
  {
    pattern: /\b(?:cures?|cured|miracle|guaranteed?|100%\s+effective|completely safe|no side effects?)\b/i,
    category: 'overclaiming',
    severity: 'block',
    message: 'Absolute efficacy/safety claim — research findings are rarely certain.',
  },
  {
    pattern: /\b(?:causes?|caused|proven to|makes you|leads? directly to)\b/i,
    category: 'causal-language',
    severity: 'warn',
    message: 'Causal language — confirm the evidence supports causation, not just correlation.',
  },
  {
    pattern: /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|iu|units?)\b|\btake\s+\d+\b|\b\d+\s+times?\s+(?:a|per)\s+day\b/i,
    category: 'dosage',
    severity: 'block',
    message: 'Specific dosage or self-treatment instruction — unsafe for patient/public content.',
  },
  {
    pattern: /\b(?:off-label|unapproved|not approved|alternative (?:cure|medicine|treatment)s?|detox(?:es|ify|ifies)?|boosts? (?:your )?immun\w*)\b/i,
    category: 'unproven-treatment',
    severity: 'warn',
    message: 'Possible unproven or off-label treatment claim.',
  },
  {
    pattern: /\bmy patient\b|\bpatient (?:named|called)\s+[A-Z]\w*/i,
    category: 'identifiable-patient',
    severity: 'block',
    message: 'Potentially identifiable patient detail.',
  },
];

/** Categories whose warn findings escalate to block for patient-facing audiences. */
const ESCALATED = new Set<SafetyFinding['category']>(['causal-language', 'unproven-treatment']);

// --- Citation-needed detection (ported from server/src/safety/citation.ts) ---

const QUANTITATIVE =
  /\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?(?:times|fold|x)\b|\bp\s?[<=>]\s?0?\.\d+|\bn\s?=\s?\d+/i;
const EVIDENCE_VERB =
  /\b(?:studies|study|research|trials?|data|evidence|meta-?analyses?|analysis)\b[^.!?]{0,40}\b(?:show|shows|showed|suggest|suggests|demonstrate|demonstrates|found|find|finds|indicate|indicates|prove|proves|proven|confirm|confirms|reveal|reveals)\b/i;
const CAUSAL =
  /\b(?:causes?|caused|leads?\s+to|results?\s+in|reduces?|increases?|prevents?|cures?|improves?|lowers?|raises?|boosts?)\b/i;
const CITATION_PRESENT =
  /\([A-Z][A-Za-z'-]+(?:\s+(?:et al\.?|and|&)\s+[A-Z][A-Za-z'-]+)?,?\s*\d{4}\)|\[\d+\]|\bdoi:|\bet al\.|https?:\/\//i;

function splitSentences(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function detectClaims(body: string): Claim[] {
  const claims: Claim[] = [];
  for (const sentence of splitSentences(body)) {
    let confidence = 0;
    if (QUANTITATIVE.test(sentence)) confidence = 0.9;
    else if (EVIDENCE_VERB.test(sentence)) confidence = 0.8;
    else if (CAUSAL.test(sentence)) confidence = 0.6;
    if (confidence === 0) continue;
    claims.push({
      text: sentence,
      needsCitation: !CITATION_PRESENT.test(sentence),
      confidence,
    });
  }
  return claims;
}

/** Runs claim + safety review over a draft for the given audience. */
export function reviewDraft(body: string, audience: StudioAudience): ReviewState {
  const patientFacing = isPatientFacing(audience);
  const findings: SafetyFinding[] = [];
  for (const rule of RULES) {
    if (!rule.pattern.test(body)) continue;
    const severity =
      patientFacing && rule.severity === 'warn' && ESCALATED.has(rule.category)
        ? 'block'
        : rule.severity;
    findings.push({ severity, category: rule.category, message: rule.message });
  }
  return {
    claims: detectClaims(body),
    findings,
    cleared: isCleared(findings),
  };
}
