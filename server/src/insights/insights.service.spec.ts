import { ReviewState } from '../domain/academic';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService, CreateContentItemInput } from '../content/content.service';
import { Insight, InsightsReport, InsightsService } from './insights.service';

const NOW = new Date('2026-06-17T12:00:00.000Z'); // Wednesday; week = Mon 2026-06-15

const itemInput: CreateContentItemInput = {
  title: 'Trees and heat',
  audience: 'peers',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
};
const cleared: ReviewState = { claims: [], findings: [], reviewedAt: 'x', cleared: true };

function build() {
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  return { content, insights: new InsightsService(content) };
}

async function clearedVariant(content: ContentService, itemId: string) {
  const v = await content.addVariant(itemId, { channel: 'linkedin', format: 'post', body: 'x' });
  await content.updateVariant(v.id, { safetyReview: cleared });
  await content.markReviewed(v.id);
  return v;
}

const byKey = (report: InsightsReport, key: string): Insight | undefined =>
  report.insights.find((i) => i.key === key);

describe('InsightsService', () => {
  it('derives the editorial checks from the content graph', async () => {
    const { content, insights } = build();

    // A: idea with no variant.
    await content.createItem({ ...itemInput, title: 'A' });
    // B: a fresh draft, unreviewed.
    const b = await content.createItem({ ...itemInput, title: 'B' });
    await content.addVariant(b.id, { channel: 'bluesky', format: 'thread', body: 'x' });
    // C: cleared but unscheduled → ready to schedule.
    const c = await content.createItem({ ...itemInput, title: 'C' });
    await clearedVariant(content, c.id);
    // D: scheduled in the past, never reviewed → not-cleared + overdue.
    const d = await content.createItem({ ...itemInput, title: 'D' });
    const dv = await content.addVariant(d.id, { channel: 'linkedin', format: 'post', body: 'x' });
    await content.scheduleVariant(dv.id, '2026-06-10T09:00:00.000Z');
    // E: cleared + scheduled THIS week → keeps it from being a "quiet week".
    const e = await content.createItem({ ...itemInput, title: 'E' });
    const ev = await clearedVariant(content, e.id);
    await content.scheduleVariant(ev.id, '2026-06-18T09:00:00.000Z');

    const report = await insights.report(undefined, NOW);

    expect(report.weekOf).toBe('2026-06-15');
    expect(report.counts).toEqual({ items: 5, variants: 4, scheduledThisWeek: 1 });

    expect(byKey(report, 'ideas-without-draft')?.findings[0].itemId).toBe(
      (await content.listItems()).find((i) => i.title === 'A')!.id,
    );
    expect(byKey(report, 'drafts-awaiting-review')?.findings[0].title).toBe('B');
    expect(byKey(report, 'reviewed-unscheduled')?.findings[0].title).toBe('C');
    expect(byKey(report, 'scheduled-not-cleared')?.findings[0].title).toBe('D');
    expect(byKey(report, 'overdue-unpublished')?.findings[0].title).toBe('D');
    expect(byKey(report, 'overdue-unpublished')?.severity).toBe('warn');
    // E is cleared, scheduled in the future → in no warning bucket.
    expect(byKey(report, 'quiet-week')).toBeUndefined();
  });

  it('flags a quiet week when content exists but nothing ships this week', async () => {
    const { content, insights } = build();
    const item = await content.createItem(itemInput);
    const v = await clearedVariant(content, item.id);
    await content.scheduleVariant(v.id, '2026-07-20T09:00:00.000Z'); // far future

    const report = await insights.report(undefined, NOW);
    expect(report.counts.scheduledThisWeek).toBe(0);
    expect(byKey(report, 'quiet-week')?.severity).toBe('info');
  });

  it('returns no insights for an empty (no-content) account', async () => {
    const { insights } = build();
    const report = await insights.report('nobody', NOW);
    expect(report.insights).toEqual([]);
    expect(report.counts).toEqual({ items: 0, variants: 0, scheduledThisWeek: 0 });
  });
});
