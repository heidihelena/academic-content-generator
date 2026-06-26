import { describe, expect, it } from 'vitest';
import { buildContentCsv } from '../src/lib/csv';
import type { ContentItemWithVariants, ContentVariant } from '../src/content/contentTypes';

let seq = 0;
function variant(over: Partial<ContentVariant> = {}): ContentVariant {
  return {
    id: `cv_${seq++}`,
    contentItemId: 'ci_1',
    channel: 'linkedin',
    format: 'post',
    body: 'x',
    hashtags: [],
    status: 'draft',
    ...over,
  };
}
function item(over: Partial<ContentItemWithVariants> = {}): ContentItemWithVariants {
  return {
    id: `ci_${seq++}`,
    title: 'Street trees',
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

const cleared = {
  safetyReview: { cleared: true, findings: [] },
  humanReviewedAt: '2026-06-16T00:00:00.000Z',
};

describe('buildContentCsv', () => {
  it('emits a header and one row per variant with the Cleared flag', () => {
    const csv = buildContentCsv([
      item({
        title: 'Trees',
        campaignId: 'cmp_heat',
        ownerId: 'alice',
        variants: [
          variant({ status: 'scheduled', scheduledAt: '2026-06-22T09:00:00.000Z', ...cleared }),
          variant({ channel: 'bluesky', status: 'draft' }),
        ],
      }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('Title,Channel,Format,Status');
    expect(lines).toHaveLength(3); // header + 2 variants
    expect(lines[1]).toContain('Trees,linkedin,post,scheduled');
    expect(lines[1]).toMatch(/,yes,cmp_heat,alice$/); // cleared · campaign · owner
    expect(lines[2]).toMatch(/,no,cmp_heat,alice$/); // unreviewed draft → not cleared
  });

  it('still emits a row for an idea with no variants', () => {
    const csv = buildContentCsv([item({ title: 'Lonely idea' })]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1].startsWith('Lonely idea,,,idea')).toBe(true);
  });

  it('quotes fields containing commas or quotes (RFC 4180)', () => {
    const csv = buildContentCsv([item({ title: 'Heat, equity and "trees"' })]);
    expect(csv).toContain('"Heat, equity and ""trees"""');
  });
});
