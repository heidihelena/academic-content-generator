import { ReviewState } from '../domain/academic';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService } from '../content/content.service';
import { InMemoryTimingRepository } from '../timing/timing.repository';
import { TimingService } from '../timing/timing.service';
import { EngagementSyncService } from './engagement-sync.service';
import { MockEngagementSource } from './engagement-source';

const cleared = (): ReviewState => ({ claims: [], findings: [], reviewedAt: 'x', cleared: true });

describe('MockEngagementSource', () => {
  it('is deterministic per ref and plausibly shaped', async () => {
    const src = new MockEngagementSource();
    const a = await src.fetch({ channel: 'linkedin', variantId: 'cv_1' });
    const b = await src.fetch({ channel: 'linkedin', variantId: 'cv_1' });
    const c = await src.fetch({ channel: 'linkedin', variantId: 'cv_2' });
    expect(a).toEqual(b); // same ref → same metrics
    expect(a).not.toEqual(c);
    expect(a.impressions!).toBeGreaterThan(0);
    expect(a.likes!).toBeLessThanOrEqual(a.impressions!);
  });
});

describe('EngagementSyncService', () => {
  function setup() {
    const content = new ContentService(
      new InMemoryContentItemsRepository(),
      new InMemoryContentVariantsRepository(),
    );
    const timing = new TimingService(new InMemoryTimingRepository());
    const sync = new EngagementSyncService(content, timing, new MockEngagementSource());
    return { content, timing, sync };
  }

  it('syncs exported variants into weighted timing outcomes', async () => {
    const { content, timing, sync } = setup();
    const item = await content.createItem({
      title: 'Trees',
      audience: 'peers',
      pillar: 'research-finding',
      evidenceLevel: 'observational',
      claimRisk: 'low',
    });
    const v = await content.addVariant(item.id, {
      channel: 'linkedin',
      format: 'post',
      body: 'note',
      safetyReview: cleared(),
    });
    await content.scheduleVariant(v.id, '2030-03-05T08:00:00.000Z'); // Tue 08:00 UTC
    await content.markReviewed(v.id);
    await content.exportVariant(v.id);

    const result = await sync.sync();
    expect(result.synced).toBe(1);
    expect(result.outcomes[0]).toMatchObject({ variantId: v.id, channel: 'linkedin' });

    // The Tue 08:00 slot now reflects engagement learning.
    const suggestions = await timing.suggest('linkedin', 'peers', 28);
    const slot = suggestions.find((s) => s.weekday === 2 && s.hour === 8);
    expect((slot?.learnedFrom ?? 0)).toBeGreaterThanOrEqual(1);
  });

  it('is a no-op when nothing is exported', async () => {
    const { sync } = setup();
    expect((await sync.sync()).synced).toBe(0);
  });
});
