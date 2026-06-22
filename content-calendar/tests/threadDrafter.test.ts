import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockThreadDrafter, buildThreadParts } from '../src/ai/mockThreadDrafter';
import { getPlatformMeta } from '../src/lib/platforms';

// The drafter simulates latency with setTimeout; use real timers so awaiting it
// resolves (the suite-wide setup enables fake timers).
beforeEach(() => {
  vi.useRealTimers();
});

const ABSTRACT =
  'In this study, we examined how street trees affect urban heat. ' +
  'We found that low-income neighbourhoods were 2°C hotter than wealthy ones. ' +
  'Tree cover was strongly associated with cooler streets. ' +
  'These results suggest that tree-planting policy should target equity.';

describe('buildThreadParts', () => {
  it('opens with an audience framing line and a thread marker', () => {
    const parts = buildThreadParts({ abstract: ABSTRACT, audience: 'general public', platform: 'bluesky' });
    expect(parts[0]).toContain('in plain language');
    expect(parts[0]).toContain('🧵');
  });

  it('extracts findings and a "why it matters" line', () => {
    const parts = buildThreadParts({ abstract: ABSTRACT, audience: 'fellow researchers', platform: 'bluesky' });
    expect(parts.some((p) => p.startsWith('🔑'))).toBe(true);
    expect(parts.some((p) => p.startsWith('Why it matters:'))).toBe(true);
  });

  it('appends a source line only when a link is provided', () => {
    const withSrc = buildThreadParts({
      abstract: ABSTRACT,
      audience: 'general public',
      platform: 'bluesky',
      sourceUrl: 'https://doi.org/10.1/x',
    });
    expect(withSrc[withSrc.length - 1]).toContain('https://doi.org/10.1/x');

    const without = buildThreadParts({ abstract: ABSTRACT, audience: 'general public', platform: 'bluesky' });
    expect(without.some((p) => p.includes('Read the paper'))).toBe(false);
  });

  it('strips academic openers from the hook', () => {
    const parts = buildThreadParts({ abstract: ABSTRACT, audience: 'students', platform: 'bluesky' });
    expect(parts[0]).not.toMatch(/in this study/i);
  });
});

describe('MockThreadDrafter', () => {
  it('fits every part within the platform limit and numbers a multi-part thread', async () => {
    const limit = getPlatformMeta('bluesky').characterLimit;
    const { parts } = await new MockThreadDrafter().draft({
      abstract: ABSTRACT,
      audience: 'general public',
      platform: 'bluesky',
      sourceUrl: 'https://doi.org/10.1/x',
    });
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(limit);
    expect(parts[parts.length - 1]).toMatch(/\(\d+\/\d+\)$/);
  });

  it('hard-splits an abstract that is one very long sentence', async () => {
    const limit = getPlatformMeta('bluesky').characterLimit;
    const long = 'We found ' + 'a notable cooling effect across many city blocks '.repeat(20) + 'in summer.';
    const { parts } = await new MockThreadDrafter().draft({
      abstract: long,
      audience: 'general public',
      platform: 'bluesky',
    });
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(limit);
  });

  it('rejects an empty abstract', async () => {
    await expect(
      new MockThreadDrafter().draft({ abstract: '   ', audience: 'general public', platform: 'bluesky' }),
    ).rejects.toThrow(/abstract/i);
  });
});
