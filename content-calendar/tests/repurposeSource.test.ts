import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repurposeSource } from '../src/repurpose/repurposeSource';
import { LocalIdeaLabClient, setIdeaLabClient } from '../src/idea-lab/ideaLabClient';
import { LocalCarouselClient, setCarouselClient } from '../src/carousel/carouselClient';
import { MockThreadDrafter } from '../src/ai/mockThreadDrafter';
import { setThreadDrafter } from '../src/ai/threadService';
import type { ThreadDrafter } from '../src/ai/threadTypes';

const seed = {
  id: 'src_heat',
  title: 'Street trees and urban heat',
  material: 'Tree cover is associated with cooler streets. Canopy reduces surface temperature.',
};

function useLocalClients() {
  setIdeaLabClient(new LocalIdeaLabClient());
  setCarouselClient(new LocalCarouselClient());
  setThreadDrafter(new MockThreadDrafter());
}

// The mock thread drafter simulates latency with a real setTimeout; the global
// setup installs fake timers, so opt back into real ones for this suite.
beforeEach(() => vi.useRealTimers());
afterEach(useLocalClients);

describe('repurposeSource', () => {
  it('produces all three formats from one source', async () => {
    useLocalClients();
    const out = await repurposeSource(seed);

    expect(out.ideas.status).toBe('ok');
    expect(out.carousel.status).toBe('ok');
    expect(out.thread.status).toBe('ok');
    if (out.ideas.status === 'ok') expect(out.ideas.data).toHaveLength(5);
    if (out.carousel.status === 'ok') expect(out.carousel.data.deck.slides[0].type).toBe('cover');
    if (out.thread.status === 'ok') expect(out.thread.data.length).toBeGreaterThan(0);
  });

  it('isolates a failing format without sinking the others', async () => {
    useLocalClients();
    // A drafter that always throws stands in for an API-mode thread failure.
    const brokenDrafter: ThreadDrafter = {
      name: 'broken',
      draft: () => Promise.reject(new Error('thread service down')),
    };
    setThreadDrafter(brokenDrafter);

    const out = await repurposeSource(seed);
    expect(out.ideas.status).toBe('ok');
    expect(out.carousel.status).toBe('ok');
    expect(out.thread.status).toBe('error');
    if (out.thread.status === 'error') expect(out.thread.message).toMatch(/down/);
  });

  it('threads the requested audience into the grounded formats', async () => {
    useLocalClients();
    const out = await repurposeSource(seed, 'patients');
    if (out.ideas.status === 'ok') expect(out.ideas.data.every((i) => i.audience === 'patients')).toBe(true);
  });
});
