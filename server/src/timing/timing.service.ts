import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AUDIENCES, Audience, CONTENT_CHANNELS, ContentChannel } from '../domain/academic';
import { candidateSlots, heuristicScore, label } from './timing.heuristic';
import { EngagementMetrics, engagementSignal } from './engagement';
import { TIMING_REPOSITORY, TimingRepository } from './timing.repository';
import { LearnedSlot, TimingOutcome, TimingSuggestion, slotId } from './timing.types';

/** How strongly a new outcome moves the learned score (EWMA factor). */
const ALPHA = 0.3;
/** Weight of the learned bonus relative to the heuristic baseline. */
const LEARNED_WEIGHT = 0.5;

/**
 * Suggests when to post and learns from outcomes. The score for a slot is the
 * explainable heuristic baseline plus a learned bonus — an EWMA of recorded
 * engagement signals for that exact (channel, audience, weekday, hour). With no
 * data it degrades cleanly to the heuristic; as outcomes arrive, good slots
 * float up. Lightweight and local-first, not an opaque model.
 */
@Injectable()
export class TimingService {
  constructor(@Inject(TIMING_REPOSITORY) private readonly repo: TimingRepository) {}

  async suggest(
    channel: ContentChannel,
    audience: Audience,
    limit = 3,
  ): Promise<TimingSuggestion[]> {
    this.validate(channel, audience);
    const learned = new Map((await this.repo.list()).map((s) => [s.id, s]));

    const ranked = candidateSlots()
      .map(({ weekday, hour }) => {
        const base = heuristicScore(channel, audience, weekday, hour);
        const seen = learned.get(slotId(channel, audience, weekday, hour));
        const score = base + (seen ? LEARNED_WEIGHT * seen.score : 0);
        return {
          weekday,
          hour,
          label: label(weekday, hour),
          score: Math.round(score * 1000) / 1000,
          rationale: seen
            ? `best-practice window + learned from ${seen.samples} outcome${seen.samples === 1 ? '' : 's'}`
            : `${channel} best-practice window`,
          learnedFrom: seen?.samples ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score || a.weekday - b.weekday || a.hour - b.hour);

    return ranked.slice(0, Math.max(1, limit));
  }

  /** Record an outcome; updates the learned EWMA for its slot. */
  async recordOutcome(outcome: TimingOutcome, now: Date = new Date()): Promise<LearnedSlot> {
    this.validate(outcome.channel, outcome.audience);
    const { weekday, hour } = this.resolveSlot(outcome);
    const signal = clamp01(outcome.signal ?? 1);

    const id = slotId(outcome.channel, outcome.audience, weekday, hour);
    const existing = await this.repo.findById(id);
    const score = existing ? (1 - ALPHA) * existing.score + ALPHA * signal : signal;

    return this.repo.upsert({
      id,
      channel: outcome.channel,
      audience: outcome.audience,
      weekday,
      hour,
      score: Math.round(score * 1000) / 1000,
      samples: (existing?.samples ?? 0) + 1,
      updatedAt: now.toISOString(),
    });
  }

  /**
   * Record real engagement: normalise the metrics to a weighted [0,1] signal,
   * then learn from it as a timing outcome. Returns the updated slot + signal.
   */
  async recordEngagement(
    input: Omit<TimingOutcome, 'signal'> & { metrics: EngagementMetrics },
    now: Date = new Date(),
  ): Promise<{ slot: LearnedSlot; signal: number }> {
    const signal = engagementSignal(input.metrics);
    const slot = await this.recordOutcome({ ...input, signal }, now);
    return { slot, signal };
  }

  private resolveSlot(outcome: TimingOutcome): { weekday: number; hour: number } {
    if (outcome.scheduledAt) {
      const d = new Date(outcome.scheduledAt);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('scheduledAt is not a valid date');
      return { weekday: d.getUTCDay(), hour: d.getUTCHours() };
    }
    if (outcome.weekday === undefined || outcome.hour === undefined) {
      throw new BadRequestException('provide scheduledAt, or both weekday and hour');
    }
    if (outcome.weekday < 0 || outcome.weekday > 6) throw new BadRequestException('weekday must be 0–6');
    if (outcome.hour < 0 || outcome.hour > 23) throw new BadRequestException('hour must be 0–23');
    return { weekday: outcome.weekday, hour: outcome.hour };
  }

  private validate(channel: ContentChannel, audience: Audience): void {
    if (!CONTENT_CHANNELS.includes(channel)) {
      throw new BadRequestException(`channel must be one of: ${CONTENT_CHANNELS.join(', ')}`);
    }
    if (!AUDIENCES.includes(audience)) {
      throw new BadRequestException(`audience must be one of: ${AUDIENCES.join(', ')}`);
    }
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
