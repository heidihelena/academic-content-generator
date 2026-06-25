import { BadRequestException } from '@nestjs/common';
import { candidateSlots, heuristicScore } from './timing.heuristic';
import { InMemoryTimingRepository } from './timing.repository';
import { TimingService } from './timing.service';

function setup() {
  return new TimingService(new InMemoryTimingRepository());
}

describe('timing heuristic', () => {
  it('scores a channel best-practice window above an off window', () => {
    // LinkedIn likes Tue–Thu mornings; Sunday night is off.
    const good = heuristicScore('linkedin', 'peers', 2, 8); // Tue 08:00
    const bad = heuristicScore('linkedin', 'peers', 0, 20); // Sun 20:00
    expect(good).toBeGreaterThan(bad);
  });

  it('offers a full grid of candidate slots', () => {
    expect(candidateSlots()).toHaveLength(7 * 4);
  });
});

describe('TimingService', () => {
  it('suggests ranked slots, defaulting to the heuristic with no data', async () => {
    const service = setup();
    const suggestions = await service.suggest('linkedin', 'peers', 3);
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].score).toBeGreaterThanOrEqual(suggestions[1].score);
    expect(suggestions[0].learnedFrom).toBe(0);
    expect(suggestions[0].rationale).toMatch(/best-practice/);
  });

  it('learns: a recorded outcome floats its slot up the ranking', async () => {
    const service = setup();
    // Pick an initially-mediocre slot and reinforce it repeatedly.
    const target = { channel: 'linkedin' as const, audience: 'peers' as const, weekday: 6, hour: 20 };
    const before = await service.suggest('linkedin', 'peers', 28);
    const rankBefore = before.findIndex((s) => s.weekday === 6 && s.hour === 20);

    for (let i = 0; i < 5; i++) await service.recordOutcome({ ...target, signal: 1 });

    const after = await service.suggest('linkedin', 'peers', 28);
    const rankAfter = after.findIndex((s) => s.weekday === 6 && s.hour === 20);
    expect(rankAfter).toBeLessThan(rankBefore); // moved up
    expect(after.find((s) => s.weekday === 6 && s.hour === 20)?.learnedFrom).toBe(5);
  });

  it('derives the slot from an ISO scheduledAt (UTC)', async () => {
    const service = setup();
    const slot = await service.recordOutcome({
      channel: 'bluesky',
      audience: 'public',
      scheduledAt: '2030-03-05T17:00:00.000Z', // Tue 17:00 UTC → weekday 2
      signal: 1,
    });
    expect(slot.weekday).toBe(2);
    expect(slot.hour).toBe(17);
  });

  it('learns from real engagement metrics (weighted signal)', async () => {
    const service = setup();
    const { slot, signal } = await service.recordEngagement({
      channel: 'linkedin',
      audience: 'peers',
      scheduledAt: '2030-03-05T08:00:00.000Z', // Tue 08:00 UTC
      metrics: { impressions: 1000, likes: 40, reposts: 15 },
    });
    expect(signal).toBeGreaterThan(0);
    expect(slot.weekday).toBe(2);
    expect(slot.hour).toBe(8);
    expect(slot.samples).toBe(1);
    // The slot now carries a learned score reflecting the engagement.
    const suggestions = await service.suggest('linkedin', 'peers', 28);
    expect(suggestions.find((s) => s.weekday === 2 && s.hour === 8)?.learnedFrom).toBe(1);
  });

  it('validates inputs', async () => {
    const service = setup();
    await expect(service.suggest('nope' as never, 'peers')).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.recordOutcome({ channel: 'linkedin', audience: 'peers' }),
    ).rejects.toBeInstanceOf(BadRequestException); // no slot info
  });
});
