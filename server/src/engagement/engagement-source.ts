import { EngagementMetrics } from '../timing/engagement';

/** What identifies a published piece to fetch engagement for. */
export interface EngagementRef {
  channel: string;
  variantId?: string;
  remoteId?: string;
}

/**
 * Where real engagement metrics come from. Local-first: the mock returns
 * deterministic synthetic metrics so the learning loop works offline and in
 * tests. A real source (a connected account's platform API) is the config-gated
 * edge — swap by configuration, never by code change.
 */
export const ENGAGEMENT_SOURCE = Symbol('ENGAGEMENT_SOURCE');

export interface EngagementSource {
  readonly name: string;
  fetch(ref: EngagementRef): Promise<EngagementMetrics | null>;
}

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic synthetic metrics — same ref → same numbers, plausibly shaped. */
export class MockEngagementSource implements EngagementSource {
  readonly name = 'mock';

  async fetch(ref: EngagementRef): Promise<EngagementMetrics> {
    const next = rng(hashSeed(ref.variantId ?? ref.remoteId ?? ref.channel));
    const impressions = 200 + Math.floor(next() * 1800);
    const likes = Math.floor(impressions * (0.01 + next() * 0.06));
    const reposts = Math.floor(likes * next() * 0.3);
    const replies = Math.floor(likes * next() * 0.2);
    const clicks = Math.floor(impressions * next() * 0.03);
    return { impressions, likes, reposts, replies, clicks };
  }
}
