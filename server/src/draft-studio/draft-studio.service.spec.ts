import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
} from '../content/content.repository';
import { ContentService } from '../content/content.service';
import { SafetyService } from '../safety/safety.service';
import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { DraftStudioService } from './draft-studio.service';
import { LocalDraftComposer } from './local.composer';
import { LocalCitationVerifier } from '../safety/citation-verifier.local';
import { CitationVerifier } from '../safety/citation-verifier.types';

const emptyVault = { listNotes: async () => [], getNote: async () => null } as never;

function setup(verifier: CitationVerifier = new LocalCitationVerifier()) {
  const sources = new SourcesService(new InMemorySourcesRepository(), emptyVault);
  const content = new ContentService(
    new InMemoryContentItemsRepository(),
    new InMemoryContentVariantsRepository(),
  );
  const service = new DraftStudioService(
    sources,
    new SafetyService(),
    content,
    new LocalDraftComposer(),
    verifier,
  );
  return { sources, content, service };
}

const fixed = new Date('2026-01-01T00:00:00.000Z');

describe('DraftStudioService', () => {
  it('produces a reviewed ContentItem + ContentVariant from a source', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Sleep and memory',
      abstract: 'rest helps recall',
      tags: ['neuro'],
    });
    const { item, variant } = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'peers' },
      fixed,
    );

    expect(item.id).toMatch(/^ci_/);
    expect(item.sourceIds).toEqual([src.id]);
    expect(item.audience).toBe('peers');
    expect(item.status).toBe('reviewed');

    expect(variant.id).toMatch(/^cv_/);
    expect(variant.contentItemId).toBe(item.id);
    expect(variant.channel).toBe('linkedin');
    expect(variant.format).toBe('post');
    expect(variant.status).toBe('reviewed');
    expect(variant.body).toContain('Sleep and memory');
    expect(variant.safetyReview?.reviewedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('persists the variant so it can move on through the pipeline', async () => {
    const { sources, content, service } = setup();
    const src = await sources.create({ kind: 'paper', title: 'Sleep and memory', abstract: 'rest helps recall' });
    const { variant } = await service.create({ sourceId: src.id, channel: 'linkedin', audience: 'peers' }, fixed);

    expect((await content.getVariant(variant.id)).status).toBe('reviewed');
    const scheduled = await content.scheduleVariant(variant.id, '2026-02-01T09:00:00.000Z');
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.scheduledAt).toBe('2026-02-01T09:00:00.000Z');
    await content.markReviewed(variant.id); // explicit human sign-off before export
    const exported = await content.exportVariant(variant.id);
    expect(exported.status).toBe('exported');
  });

  it('maps each channel to its natural format', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X', abstract: 'a' });
    const bluesky = await service.create({ sourceId: src.id, channel: 'bluesky', audience: 'peers' }, fixed);
    expect(bluesky.variant.format).toBe('thread');
    const teaching = await service.create({ sourceId: src.id, channel: 'teaching', audience: 'peers' }, fixed);
    expect(teaching.variant.format).toBe('slide');
  });

  it('uses a provided idea hook/angle in the body', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X' });
    const { variant } = await service.create(
      {
        sourceId: src.id,
        channel: 'threads',
        audience: 'students',
        idea: { hook: 'Did you know?', angle: 'memory tricks' },
      },
      fixed,
    );
    expect(variant.body).toContain('Did you know?');
    expect(variant.body).toContain('memory tricks');
    expect(variant.hook).toBe('Did you know?');
  });

  it('flags unsafe content in the safetyReview', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'This drug cures everything',
      abstract: 'guaranteed 100% effective',
    });
    const { variant } = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'public' },
      fixed,
    );
    expect(variant.safetyReview?.cleared).toBe(false);
    expect(variant.safetyReview?.findings.length).toBeGreaterThan(0);
  });

  it('folds a citation-support contradiction into the review and blocks export', async () => {
    // A claim the verifier judges to contradict its cited source must block —
    // the same export gate the medical reviewers use.
    const contradicts: CitationVerifier = {
      name: 'local',
      verify: async () => ({ support: 'contradicted', verifier: 'local', polarityCue: 'did not' }),
    };
    const { sources, service } = setup(contradicts);
    const src = await sources.create({
      kind: 'paper',
      title: 'Coffee and alertness',
      // Embeds an empirical claim (n=120) with no inline citation → needsCitation.
      abstract: 'Coffee reduced fatigue in a trial (n=120).',
    });
    const { variant } = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'peers' },
      fixed,
    );

    expect(variant.safetyReview?.cleared).toBe(false);
    expect(
      variant.safetyReview?.findings.some((f) => f.category === 'citation-unsupported'),
    ).toBe(true);
  });

  it('leaves the review cleared when the source supports the claim (no false block)', async () => {
    const { sources, service } = setup(); // real local verifier
    const src = await sources.create({
      kind: 'paper',
      title: 'Coffee and alertness',
      abstract: 'Coffee reduced fatigue in a trial (n=120).',
    });
    const { variant } = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'peers' },
      fixed,
    );
    expect(variant.safetyReview?.cleared).toBe(true);
  });

  it('validates channel and audience before loading the source', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X' });
    await expect(
      service.create({ sourceId: src.id, channel: 'bogus' as never, audience: 'peers' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ sourceId: src.id, channel: 'linkedin', audience: 'bogus' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s for an unknown source', async () => {
    const { service } = setup();
    await expect(
      service.create({ sourceId: 'src_missing', channel: 'linkedin', audience: 'peers' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adds the not-medical-advice disclaimer for patient-facing audiences (#34)', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'paper', title: 'Sleep' });
    const patient = await service.create(
      { sourceId: src.id, channel: 'newsletter', audience: 'patients' },
      fixed,
    );
    expect(patient.variant.body.toLowerCase()).toContain('not medical advice');
    expect(patient.item.claimRisk).toBe('moderate'); // patient-facing default

    const peers = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'peers' },
      fixed,
    );
    expect(peers.variant.body.toLowerCase()).not.toContain('not medical advice');
  });

  it('blocks export of causal claims for a patient audience but not for peers (#34)', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Coffee and weight',
      abstract: 'Drinking coffee causes weight loss in observational data.',
    });
    const patient = await service.create(
      { sourceId: src.id, channel: 'instagram', audience: 'public' },
      fixed,
    );
    expect(patient.variant.safetyReview?.cleared).toBe(false);

    const peers = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'peers' },
      fixed,
    );
    expect(peers.variant.safetyReview?.cleared).toBe(true);
  });

  it('suggests a hook for a source', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'paper', title: 'Street trees' });
    const { hook } = await service.hook(src.id, 'linkedin', 'peers');
    expect(hook).toContain('Street trees');
  });

  it('validates channel/audience and 404s an unknown source for hook()', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X' });
    await expect(service.hook(src.id, 'bogus' as never, 'peers')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.hook('src_missing', 'linkedin', 'peers')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
