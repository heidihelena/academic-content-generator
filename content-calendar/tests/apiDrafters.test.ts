import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiThreadDrafter } from '../src/ai/apiThreadDrafter';
import { ApiShortsPlanner } from '../src/ai/apiShortsPlanner';
import type { ApiClient } from '../src/lib/api';

// The local fallback drafters simulate latency with setTimeout.
beforeEach(() => vi.useRealTimers());

const ABSTRACT =
  'In this study, we examined urban heat. We found a two degree gap. These results suggest policy should target equity.';
const TRANSCRIPT = '0:00 Welcome\n0:30 We found a two degree gap\n1:10 Why it matters for policy';

describe('ApiThreadDrafter', () => {
  it('uses the backend LLM result when available', async () => {
    const api = { post: vi.fn().mockResolvedValue({ parts: ['part 1', 'part 2'], source: 'claude:x' }) };
    const drafter = new ApiThreadDrafter(api as unknown as ApiClient);
    const res = await drafter.draft({ abstract: ABSTRACT, audience: 'general public', platform: 'bluesky' });
    expect(res.parts).toEqual(['part 1', 'part 2']);
    expect(res.source).toBe('claude:x');
  });

  it('falls back to the local drafter when the backend fails', async () => {
    const api = { post: vi.fn().mockRejectedValue(new Error('503')) };
    const drafter = new ApiThreadDrafter(api as unknown as ApiClient);
    const res = await drafter.draft({ abstract: ABSTRACT, audience: 'general public', platform: 'bluesky' });
    expect(res.parts.length).toBeGreaterThan(0); // produced by the local heuristic
  });
});

describe('ApiShortsPlanner', () => {
  it('maps backend shorts and derives a time range', async () => {
    const api = {
      post: vi.fn().mockResolvedValue({
        shorts: [{ title: 'T', hook: 'H', caption: 'C', startSeconds: 30, endSeconds: 70 }],
        source: 'claude:x',
      }),
    };
    const planner = new ApiShortsPlanner(api as unknown as ApiClient);
    const res = await planner.plan({ transcript: TRANSCRIPT, audience: 'general public', count: 1 });
    expect(res.shorts[0].timeRange).toBe('0:30–1:10');
    expect(res.shorts[0].id).toMatch(/^short/);
  });

  it('falls back to the local planner when the backend fails', async () => {
    const api = { post: vi.fn().mockRejectedValue(new Error('503')) };
    const planner = new ApiShortsPlanner(api as unknown as ApiClient);
    const res = await planner.plan({ transcript: TRANSCRIPT, audience: 'general public', count: 2 });
    expect(res.shorts.length).toBeGreaterThan(0);
  });
});
