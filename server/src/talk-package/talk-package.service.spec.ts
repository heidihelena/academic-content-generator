import { InMemoryCampaignsRepository } from '../campaigns/campaigns.repository';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ContentPlanService } from '../content-plan/content-plan.service';
import { InMemoryOutputsRepository } from '../outputs/outputs.repository';
import { OutputsService } from '../outputs/outputs.service';
import { ReuseService } from '../reuse/reuse.service';
import { SafetyService } from '../safety/safety.service';
import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { LocalTalkComposer } from './local.talk-composer';
import { TalkPackageService } from './talk-package.service';

const emptyVault = { listNotes: async () => [], getNote: async () => null } as never;

function setup(composer = new LocalTalkComposer()) {
  const sources = new SourcesService(new InMemorySourcesRepository(), emptyVault);
  const campaigns = new CampaignsService(new InMemoryCampaignsRepository());
  const outputs = new OutputsService(new InMemoryOutputsRepository());
  const service = new TalkPackageService(
    new ContentPlanService(sources),
    campaigns,
    new SafetyService(),
    outputs,
    new ReuseService(outputs),
    composer,
  );
  return { sources, campaigns, outputs, service };
}

describe('TalkPackageService', () => {
  it('generates a talk + one short per point, persisted as a campaign', async () => {
    const { sources, campaigns, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Street trees and urban heat',
      abstract: 'Tree cover cooled streets. Low-income areas had less of it. The gap widened in summer.',
    });

    const result = await service.generate({ sourceId: src.id, durationMin: 12, url: 'vahtian.com/x' });

    // Talk anchor.
    expect(result.talk.channel).toBe('talk');
    expect(result.talk.body).toContain('## Opening');
    expect(result.estimatedMinutes).toBeGreaterThan(0);

    // One short per genuine point (3 sentences → 3 points → 3 shorts).
    expect(result.shorts).toHaveLength(3);
    expect(result.shorts.every((s) => s.channel === 'shorts')).toBe(true);
    expect(result.shorts[0].body).toContain('CTA: ');

    // Persisted campaign, with every output linked to it.
    expect(await campaigns.get(result.campaign.id)).toBeTruthy();
    for (const out of [result.talk, ...result.shorts]) {
      expect(out.campaignId).toBe(result.campaign.id);
      expect(out.reviewState).toBeDefined();
    }
  });

  it('persists the talk + shorts to the outputs store, linked to the campaign', async () => {
    const { sources, outputs, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Trees',
      abstract: 'Canopy cooled streets. Low-income areas had less.',
    });
    const result = await service.generate({ sourceId: src.id });

    const stored = await outputs.list({ campaignId: result.campaign.id });
    expect(stored).toHaveLength(1 + result.shorts.length);
    expect(stored.filter((o) => o.channel === 'talk')).toHaveLength(1);
    expect((await outputs.get(result.talk.id)).body).toBe(result.talk.body);
  });

  it('feeds prior outputs from the same source to the composer on regeneration', async () => {
    const seen: string[][] = [];
    const composer = new LocalTalkComposer();
    const original = composer.composeTalk.bind(composer);
    composer.composeTalk = (plan, opts) => {
      seen.push(opts.priorContext ?? []);
      return original(plan, opts);
    };

    const { sources, service } = setup(composer);
    const src = await sources.create({ kind: 'paper', title: 'Trees', abstract: 'Canopy cooled streets.' });

    await service.generate({ sourceId: src.id }); // first: nothing prior
    await service.generate({ sourceId: src.id }); // second: sees the first package

    expect(seen[0]).toEqual([]);
    expect(seen[1].length).toBeGreaterThan(0);
    expect(seen[1].some((c) => c.startsWith('talk/'))).toBe(true);
  });

  it('does not pad to a fixed count — a 1-sentence source yields a 1-short package', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X', abstract: 'Only one finding.' });
    const result = await service.generate({ sourceId: src.id });
    expect(result.shorts).toHaveLength(1);
  });

  it('surfaces an overclaim in the package-level review and respects audience', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Our method proves causation and is 100% accurate',
      abstract: 'A short abstract.',
    });
    const result = await service.generate({ sourceId: src.id, audience: 'public' });
    expect(result.review.cleared).toBe(false);
    expect(result.review.findings.some((f) => f.category === 'overclaiming')).toBe(true);
    expect(result.talk.body).toContain('not medical advice'); // patient-facing disclaimer
  });
});
