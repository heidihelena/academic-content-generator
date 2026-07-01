import { reviewDraft } from '../studio/studioReview';
import type { StudioAudience } from '../studio/studioTypes';

/**
 * Classify a draft's review needs for the Review Queue. Maps the safety
 * reviewer's categories/severities onto reviewer-facing issue types with the
 * low/medium/high/blocking scale. The app flags what to check — it never
 * decides scientific truth.
 */

export type IssueSeverity = 'low' | 'medium' | 'high' | 'blocking';

export interface ReviewIssue {
  type:
    | 'citation needed'
    | 'overclaim'
    | 'patient safety concern'
    | 'unsupported certainty'
    | 'promotional tone'
    | 'needs human review';
  severity: IssueSeverity;
  text: string;
}

export function issueRank(s: IssueSeverity): number {
  return { low: 0, medium: 1, high: 2, blocking: 3 }[s];
}

export function classifyIssues(body: string, audience: StudioAudience): ReviewIssue[] {
  const review = reviewDraft(body, audience);
  const issues: ReviewIssue[] = [];

  for (const f of review.findings) {
    const severity: IssueSeverity = f.severity === 'block' ? 'blocking' : f.severity === 'warn' ? 'medium' : 'low';
    switch (f.category) {
      case 'overclaiming':
        issues.push({ type: 'overclaim', severity, text: f.message });
        break;
      case 'causal-language':
        issues.push({ type: 'unsupported certainty', severity, text: f.message });
        break;
      case 'dosage':
      case 'unproven-treatment':
      case 'identifiable-patient':
        issues.push({ type: 'patient safety concern', severity, text: f.message });
        break;
      default:
        issues.push({ type: 'needs human review', severity, text: f.message });
    }
  }

  for (const claim of review.claims.filter((c) => c.needsCitation)) {
    issues.push({
      type: 'citation needed',
      severity: claim.confidence >= 0.9 ? 'high' : 'medium',
      text: claim.text,
    });
  }

  if (/\b(?:buy now|limited time|don'?t miss|sign up today|exclusive offer)\b/i.test(body)) {
    issues.push({ type: 'promotional tone', severity: 'low', text: 'Wording reads as promotional rather than informational.' });
  }

  return issues.sort((a, b) => issueRank(b.severity) - issueRank(a.severity));
}
