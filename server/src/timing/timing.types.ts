import { Audience, ContentChannel } from '../domain/academic';

/** A candidate posting slot with its score and a plain-language rationale. */
export interface TimingSuggestion {
  weekday: number; // 0=Sun … 6=Sat (UTC)
  hour: number; // 0–23 (UTC)
  label: string; // e.g. "Tue 12:00"
  score: number; // 0..1-ish, higher = better
  rationale: string;
  learnedFrom: number; // how many recorded outcomes informed this slot
}

/** An observed result for a slot — feeds the learned score. */
export interface TimingOutcome {
  channel: ContentChannel;
  audience: Audience;
  /** Either an ISO timestamp (weekday+hour derived in UTC) … */
  scheduledAt?: string;
  /** … or an explicit slot. */
  weekday?: number;
  hour?: number;
  /** Engagement signal in [0,1] (default 1 = a positive outcome). */
  signal?: number;
}

/** A persisted learned aggregate for one (channel, audience, weekday, hour) slot. */
export interface LearnedSlot {
  id: string; // `${channel}:${audience}:${weekday}:${hour}`
  channel: ContentChannel;
  audience: Audience;
  weekday: number;
  hour: number;
  /** Exponentially-weighted moving average of the outcome signal. */
  score: number;
  samples: number;
  updatedAt: string;
}

export const slotId = (
  channel: string,
  audience: string,
  weekday: number,
  hour: number,
): string => `${channel}:${audience}:${weekday}:${hour}`;
