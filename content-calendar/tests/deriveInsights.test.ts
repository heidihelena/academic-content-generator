import { describe, expect, it } from 'vitest';
import { deriveInsights } from '../src/insights/deriveInsights';
import type { ContentItemWithVariants, ContentVariant } from '../src/content/contentTypes';

const NOW = new Date('2026-06-17T12:00:00.000Z'); // Wed; week = Mon 2026-06-15

let seq = 0;
function item(over: Partial<ContentItemWithVariants> = {}): ContentItemWithVariants {
  return {
    id: `ci_${seq++}`,
    title: 'Idea',
    sourceIds: [],
    audience: 'peers',
    pillar: 'research-finding',
    evidenceLevel: 'observational',
    claimRisk: 'low',
    status: 'idea',
    variants: [],
    ...over,
  };
}
function variant(over: Partial<ContentVariant> = {}): ContentVariant {
  return {
    id: `cv_${seq++}`,
    contentItemId: 'ci',
    channel: 'linkedin',
    format: 'post',
    body: 'x',
    hashtags: [],
    status: 'draft',
    ...over,
  };
}
const clearedFields = {
  safetyReview: { cleared: true, findings: [] },
  humanReviewedAt: '2026-06-16T00:00:00.000Z',
};
const byKey = (r: ReturnType<typeof deriveInsights>, k: string) => r.insights.find((i) => i.key === k);

describe('deriveInsights', () => {
  it('flags ideas with no draft', () => {
    const r = deriveInsights([item()], NOW);
    expect(byKey(r, 'ideas-without-draft')?.findings).toHaveLength(1);
    expect(r.counts).toEqual({ items: 1, variants: 0, scheduledThisWeek: 0 });
  });

  it('flags a cleared, unscheduled variant as ready to schedule', () => {
    const r = deriveInsights([item({ variants: [variant({ status: 'reviewed', ...clearedFields })] })], NOW);
    expect(byKey(r, 'reviewed-unscheduled')?.findings).toHaveLength(1);
  });

  it('warns on scheduled-but-not-cleared and overdue', () => {
    const v = variant({ status: 'scheduled', scheduledAt: '2026-06-10T09:00:00.000Z' }); // past, no review
    const r = deriveInsights([item({ variants: [v] })], NOW);
    expect(byKey(r, 'scheduled-not-cleared')?.severity).toBe('warn');
    expect(byKey(r, 'overdue-unpublished')?.severity).toBe('warn');
  });

  it('flags a quiet week when nothing ships this week', () => {
    const v = variant({ status: 'scheduled', scheduledAt: '2026-07-20T09:00:00.000Z', ...clearedFields });
    const r = deriveInsights([item({ variants: [v] })], NOW);
    expect(r.counts.scheduledThisWeek).toBe(0);
    expect(byKey(r, 'quiet-week')).toBeTruthy();
  });

  it('counts a variant scheduled this week and stays quiet otherwise', () => {
    const v = variant({ status: 'scheduled', scheduledAt: '2026-06-18T09:00:00.000Z', ...clearedFields });
    const r = deriveInsights([item({ variants: [v] })], NOW);
    expect(r.counts.scheduledThisWeek).toBe(1);
    expect(byKey(r, 'quiet-week')).toBeUndefined();
  });

  it('returns no insights for empty content', () => {
    expect(deriveInsights([], NOW).insights).toEqual([]);
  });
});
