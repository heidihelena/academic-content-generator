import { reviewDraft } from '../studio/studioReview';
import type { StudioAudience } from '../studio/studioTypes';
import type { AcademicIdea } from './ideaLabClient';

/**
 * Grade a generated idea before any drafting happens, so the researcher sees
 * up front what publishing it would involve: how risky the material is, whether
 * it will need citations, and whether it must pass the medical-safety review.
 * Deterministic and local — it reuses the same reviewer the Draft Studio runs.
 */

export type IdeaRiskLevel = 'low' | 'medium' | 'high';

export interface IdeaAssessment {
  riskLevel: IdeaRiskLevel;
  /** The source material contains claims that will need a citation. */
  citationNeed: boolean;
  /** Publishing this idea requires the medical-safety review to clear. */
  safetyNeed: boolean;
}

const PATIENT_FACING: readonly StudioAudience[] = ['patients', 'public'];

export function assessIdea(idea: Pick<AcademicIdea, 'channel' | 'audience'>, material: string): IdeaAssessment {
  const audience: StudioAudience = PATIENT_FACING.includes(idea.audience as StudioAudience)
    ? (idea.audience as StudioAudience)
    : 'peers';
  const review = reviewDraft(material, audience);

  const hasBlock = review.findings.some((f) => f.severity === 'block');
  const hasWarn = review.findings.some((f) => f.severity === 'warn');
  const citationNeed = review.claims.some((c) => c.needsCitation);

  const patientFacing = PATIENT_FACING.includes(idea.audience as StudioAudience);
  const safetyNeed = patientFacing || hasBlock || hasWarn;

  const riskLevel: IdeaRiskLevel = hasBlock ? 'high' : hasWarn || (patientFacing && citationNeed) ? 'medium' : 'low';

  return { riskLevel, citationNeed, safetyNeed };
}
