import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockShortsPlanner } from '../src/ai/mockShortsPlanner';

// The planner simulates latency with setTimeout; use real timers so awaiting it
// resolves (the suite-wide setup enables fake timers).
beforeEach(() => {
  vi.useRealTimers();
});

const TIMED = [
  '0:00 Welcome back to the channel',
  '0:20 We found that urban trees cool poorer streets far less than wealthy ones',
  '0:55 The surprising result is a two degree heat gap across the same city',
  '1:40 Why does this matter for public health and policy',
  '2:20 Here is what councils should actually do next',
].join('\n');

describe('MockShortsPlanner', () => {
  it('plans clips with titles, hooks, captions and time ranges', async () => {
    const { shorts, source } = await new MockShortsPlanner().plan({
      transcript: TIMED,
      videoUrl: 'https://youtu.be/abc',
      count: 2,
      audience: 'general public',
    });
    expect(source).toMatch(/shorts/);
    expect(shorts.length).toBeGreaterThan(0);
    expect(shorts.length).toBeLessThanOrEqual(2);
    for (const s of shorts) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.hook.length).toBeGreaterThan(0);
      expect(s.caption.length).toBeGreaterThan(0);
      expect(s.timeRange).toMatch(/\d+:\d{2}/); // timestamped transcript ⇒ a range
      expect(typeof s.startSeconds).toBe('number');
    }
  });

  it('works without timestamps (no time range)', async () => {
    const { shorts } = await new MockShortsPlanner().plan({
      transcript: 'First finding here. Second finding here. Third finding here.',
      count: 2,
      audience: 'students',
    });
    expect(shorts.length).toBeGreaterThan(0);
    expect(shorts[0].timeRange).toBeUndefined();
    expect(shorts[0].startSeconds).toBeUndefined();
  });

  it('rejects an empty transcript', async () => {
    await expect(
      new MockShortsPlanner().plan({ transcript: '   ', count: 3, audience: 'general public' }),
    ).rejects.toThrow(/transcript/i);
  });
});
