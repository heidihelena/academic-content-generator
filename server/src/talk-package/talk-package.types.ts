import { Audience, Campaign, ContentOutput, ReviewState } from '../domain/academic';
import { ContentPlan } from '../content-plan/content-plan.types';

export interface TalkPackageRequest {
  sourceId: string;
  audience?: Audience;
  /** Target talk length in minutes (default 12); drives the number of points/shorts. */
  durationMin?: number;
  /** Link for the talk close and the shorts' CTA. */
  url?: string;
  /** Overrides the auto-generated campaign title. */
  campaignTitle?: string;
}

/**
 * A talk package: a persisted {@link Campaign} (the series anchor) plus the
 * generated long-form talk and its derived shorts (one per genuine point),
 * sharing the same source and a package-level safety review.
 */
export interface TalkPackageResult {
  campaign: Campaign;
  plan: ContentPlan;
  talk: ContentOutput;
  shorts: ContentOutput[];
  /** Aggregate safety review over the talk + all shorts. */
  review: ReviewState;
  estimatedMinutes: number;
}
