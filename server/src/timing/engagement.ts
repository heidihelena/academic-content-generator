/**
 * Turns raw engagement metrics into a weighted signal in [0,1] for the timing
 * optimizer. Explainable: named weights, a transparent engagement rate when
 * impressions are known, and a saturating curve on raw reactions otherwise.
 */
export interface EngagementMetrics {
  impressions?: number;
  likes?: number;
  reposts?: number;
  replies?: number;
  clicks?: number;
}

/** Reaction weights — a repost is worth more than a like, a reply more than a click. */
export const ENGAGEMENT_WEIGHTS = { likes: 1, reposts: 3, replies: 2, clicks: 1.5 } as const;

/** Weighted count of reactions. */
export function engagementScore(m: EngagementMetrics): number {
  return (
    (m.likes ?? 0) * ENGAGEMENT_WEIGHTS.likes +
    (m.reposts ?? 0) * ENGAGEMENT_WEIGHTS.reposts +
    (m.replies ?? 0) * ENGAGEMENT_WEIGHTS.replies +
    (m.clicks ?? 0) * ENGAGEMENT_WEIGHTS.clicks
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * The engagement signal in [0,1].
 * - With impressions: a weighted engagement rate, where ~20% maps to 1.0.
 * - Without: a saturating curve on the raw weighted score (diminishing returns),
 *   so a few reactions register but huge counts don't dominate.
 */
export function engagementSignal(m: EngagementMetrics): number {
  const score = engagementScore(m);
  if (m.impressions && m.impressions > 0) {
    return clamp01((score / m.impressions) * 5);
  }
  return clamp01(1 - Math.exp(-score / 20));
}
