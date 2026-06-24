import { Injectable } from '@nestjs/common';
import { ReviewState, isCleared } from '../domain/academic';
import { detectClaims } from './citation';
import { reviewOverclaiming } from './overclaiming';

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
   * deterministic in tests.
   */
  review(body: string, now: Date = new Date()): ReviewState {
    const findings = reviewOverclaiming(body);
    return {
      claims: detectClaims(body),
      findings,
      reviewedAt: now.toISOString(),
      cleared: isCleared(findings),
    };
  }
}
