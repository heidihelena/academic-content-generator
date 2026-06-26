import { Injectable } from '@nestjs/common';
import { ContentVariant, ReviewState } from '../domain/academic';
import { claimsNeedingCitation, detectClaims } from '../safety/citation';
import { SafetyService } from '../safety/safety.service';
import { ContentService } from './content.service';

/**
 * Runs the medical-safety and citation reviews on a variant and records the
 * results, plus the human sign-off — the actions behind the editor's review
 * gate (Draft → run review → findings → fix → cleared for export).
 */
@Injectable()
export class ContentReviewService {
  constructor(
    private readonly content: ContentService,
    private readonly safety: SafetyService,
  ) {}

  /** Medical-overclaiming review (audience-aware, patient-safe escalation). */
  async runSafetyReview(variantId: string, now: Date = new Date(), scope?: string): Promise<ContentVariant> {
    const variant = await this.content.getVariant(variantId, scope);
    const item = await this.content.getItem(variant.contentItemId, scope);
    const safetyReview = this.safety.review(variant.body, now, item.audience);
    return this.content.updateVariant(variantId, { safetyReview }, now, scope);
  }

  /** Citation-support review: which claims still need a supporting citation. */
  async runCitationReview(variantId: string, now: Date = new Date(), scope?: string): Promise<ContentVariant> {
    const variant = await this.content.getVariant(variantId, scope);
    const citationReview: ReviewState = {
      claims: detectClaims(variant.body),
      findings: [],
      reviewedAt: now.toISOString(),
      cleared: claimsNeedingCitation(variant.body).length === 0,
    };
    return this.content.updateVariant(variantId, { citationReview }, now, scope);
  }

  markReviewed(variantId: string, now: Date = new Date(), scope?: string): Promise<ContentVariant> {
    return this.content.markReviewed(variantId, now, scope);
  }
}
