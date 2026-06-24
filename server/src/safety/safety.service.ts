import { Injectable } from '@nestjs/common';
import { Audience, ReviewState, isCleared } from '../domain/academic';
import { detectClaims } from './citation';
import { reviewOverclaiming } from './overclaiming';
import { escalateForAudience } from './patient-safe';

/**
 * Runs the claim + medical-safety reviewers over a draft and combines their
 * output into a single ReviewState (issues #32, #33). This is the seam the
 * Draft Studio review step calls.
 */
@Injectable()
export class SafetyService {
  /**
   * Reviews `body` and returns the combined claims + findings. `now` is a
   * parameter (defaulting to the current time) so `reviewedAt` stays
   * deterministic in tests. When `audience` is patient-facing, advisory
   * findings are escalated so they gate export (patient-safe mode, #34).
   */
  review(body: string, now: Date = new Date(), audience?: Audience): ReviewState {
    const findings = audience
      ? escalateForAudience(reviewOverclaiming(body), audience)
      : reviewOverclaiming(body);
    return {
      claims: detectClaims(body),
      findings,
      reviewedAt: now.toISOString(),
      cleared: isCleared(findings),
    };
  }
}
