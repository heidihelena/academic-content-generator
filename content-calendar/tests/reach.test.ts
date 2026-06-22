import { describe, expect, it } from 'vitest';
import { analyzeReach, reachVerdict } from '../src/lib/reach';

const codes = (findings: ReturnType<typeof analyzeReach>) => findings.map((f) => f.code);

describe('analyzeReach — link demotion', () => {
  it('warns about an outbound link in the post on link-demoted platforms', () => {
    const f = analyzeReach({ platform: 'linkedin', body: 'Big result! https://doi.org/10.1/x' });
    expect(codes(f)).toContain('link-in-post');
  });

  it('does not warn about links on Mastodon (no link penalty)', () => {
    const f = analyzeReach({ platform: 'mastodon', body: 'Read it https://example.com/page' });
    expect(codes(f)).not.toContain('link-in-post');
  });
});

describe('analyzeReach — paywall & hashtags', () => {
  it('nudges to add a free version when only a DOI is present', () => {
    const f = analyzeReach({ platform: 'mastodon', body: 'New paper https://doi.org/10.1/x' });
    expect(codes(f)).toContain('paywalled-link');
  });

  it('does not nudge when a preprint link is included', () => {
    const f = analyzeReach({ platform: 'mastodon', body: 'doi.org/10.1/x and arxiv.org/abs/1' });
    expect(codes(f)).not.toContain('paywalled-link');
  });

  it('warns on hashtag overload past the platform ceiling', () => {
    const f = analyzeReach({ platform: 'bluesky', body: 'hi #a #b #c #d #e' });
    expect(codes(f)).toContain('too-many-hashtags');
  });
});

describe('analyzeReach — formatting', () => {
  it('flags a wall of text', () => {
    const f = analyzeReach({ platform: 'bluesky', body: 'word '.repeat(80) });
    expect(codes(f)).toContain('wall-of-text');
  });

  it('flags shouting and missing alt text', () => {
    const f = analyzeReach({ platform: 'bluesky', body: 'THIS IS ENORMOUSLY IMPORTANT', mediaCount: 1 });
    expect(codes(f)).toContain('all-caps');
    expect(codes(f)).toContain('alt-text');
  });

  it('returns nothing for a clean short post', () => {
    expect(analyzeReach({ platform: 'bluesky', body: 'A clear, short finding in plain words.' })).toEqual([]);
  });
});

describe('reachVerdict', () => {
  it('is good when there are no findings', () => {
    expect(reachVerdict([]).tone).toBe('good');
  });

  it('warns and counts when there are findings', () => {
    const v = reachVerdict(analyzeReach({ platform: 'linkedin', body: 'x https://doi.org/10.1/x #a #b #c #d #e #f' }));
    expect(v.tone).toBe('warn');
    expect(v.warnings).toBeGreaterThan(0);
  });
});
