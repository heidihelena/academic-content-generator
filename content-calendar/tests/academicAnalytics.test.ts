import { describe, expect, it } from 'vitest';
import {
  averageReadingGrade,
  evidenceMix,
  reachByNetwork,
  sourceCoverage,
} from '../src/analytics/calculations';
import type { Post } from '../src/types';

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: Math.random().toString(36).slice(2),
    platform: 'bluesky',
    body: 'A short post.',
    scheduledAt: '2026-06-22T09:00:00.000Z',
    status: 'published',
    media: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('evidenceMix', () => {
  it('counts posts by evidence level including "none"', () => {
    const mix = evidenceMix([
      post({ evidenceLevel: 'peer_reviewed' }),
      post({ evidenceLevel: 'peer_reviewed' }),
      post({ evidenceLevel: 'opinion' }),
      post({}),
    ]);
    const by = Object.fromEntries(mix.map((m) => [m.level, m.count]));
    expect(by.peer_reviewed).toBe(2);
    expect(by.opinion).toBe(1);
    expect(by.preliminary).toBe(0);
    expect(by.none).toBe(1);
  });
});

describe('sourceCoverage', () => {
  it('measures how many evidence-based claims link a source', () => {
    const c = sourceCoverage([
      post({ evidenceLevel: 'peer_reviewed', source: { doi: '10.1/x' } }),
      post({ evidenceLevel: 'preliminary', source: { url: 'https://osf.io/x' } }),
      post({ evidenceLevel: 'peer_reviewed' }), // missing source
      post({ evidenceLevel: 'opinion' }), // not a claim — ignored
      post({}), // no level — ignored
    ]);
    expect(c.claims).toBe(3);
    expect(c.linked).toBe(2);
    expect(c.missing).toBe(1);
    expect(c.percentage).toBe(67);
  });

  it('reports 100% when there are no claims', () => {
    expect(sourceCoverage([post({ evidenceLevel: 'opinion' })]).percentage).toBe(100);
  });
});

describe('averageReadingGrade', () => {
  it('averages the grade across posts with enough copy and ignores short ones', () => {
    const simple = 'We found that more trees keep a street cool on hot summer days.';
    const grade = averageReadingGrade([post({ body: simple }), post({ body: 'Too short.' })]);
    expect(grade).toBeGreaterThan(0);
  });

  it('returns 0 when nothing qualifies', () => {
    expect(averageReadingGrade([post({ body: 'Hi.' })])).toBe(0);
  });
});

describe('reachByNetwork', () => {
  it('sums impressions per platform from posts with engagement', () => {
    const reach = reachByNetwork([
      post({ platform: 'bluesky', engagement: { likes: 1, comments: 0, shares: 0, impressions: 1000 } }),
      post({ platform: 'bluesky', engagement: { likes: 0, comments: 0, shares: 0, impressions: 500 } }),
      post({ platform: 'linkedin', engagement: { likes: 0, comments: 0, shares: 0, impressions: 200 } }),
      post({ platform: 'linkedin' }), // no engagement — ignored
    ]);
    const by = Object.fromEntries(reach.map((r) => [r.platform, r.impressions]));
    expect(by.bluesky).toBe(1500);
    expect(by.linkedin).toBe(200);
  });
});
