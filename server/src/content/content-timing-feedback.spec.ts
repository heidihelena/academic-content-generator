import { ReviewState } from '../domain/academic';
import { InMemoryTimingRepository } from '../timing/timing.repository';
import { TimingService } from '../timing/timing.service';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from './content.repository';
import { ContentService } from './content.service';

const cleared = (): ReviewState => ({ claims: [], findings: [], reviewedAt: 'x', cleared: true });

function setup() {
  const timing = new TimingService(new InMemoryTimingRepository());
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
    timing,
  );
  return { content, timing };
}

describe('export → timing feedback (learning loop)', () => {
  it('records a timing outcome when a variant is exported, shifting its slot', async () => {
    const { content, timing } = setup();
    const item = await content.createItem({
      title: 'Trees',
      audience: 'peers',
      pillar: 'research-finding',
      evidenceLevel: 'observational',
      claimRisk: 'low',
    });
    const variant = await content.addVariant(item.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'A clean note.',
      safetyReview: cleared(),
    });

    const scheduledAt = '2030-03-09T20:00:00.000Z'; // a specific UTC slot
    const weekday = new Date(scheduledAt).getUTCDay();
    const hour = new Date(scheduledAt).getUTCHours();

    await content.scheduleVariant(variant.id, scheduledAt);
    await content.markReviewed(variant.id);
    await content.exportVariant(variant.id);

    // The optimizer now has a learned outcome for that exact slot.
    const suggestions = await timing.suggest('linkedin', 'peers', 28);
    const slot = suggestions.find((s) => s.weekday === weekday && s.hour === hour);
    expect(slot?.learnedFrom).toBe(1);
    expect(slot?.rationale).toMatch(/learned from/);
  });

  it('export still works when the optimizer is not wired in (optional dep)', async () => {
    const content = new ContentService(
      new InMemoryContentItemsRepository(),
      new InMemoryContentVariantsRepository(),
    );
    const item = await content.createItem({
      title: 'X',
      audience: 'peers',
      pillar: 'explainer',
      evidenceLevel: 'unknown',
      claimRisk: 'low',
    });
    const v = await content.addVariant(item.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'note',
      safetyReview: cleared(),
    });
    await content.markReviewed(v.id);
    expect((await content.exportVariant(v.id)).status).toBe('exported');
  });
});
