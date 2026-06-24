import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SafetyService } from '../safety/safety.service';
import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { DraftStudioService } from './draft-studio.service';

function setup() {
  const sources = new SourcesService(new InMemorySourcesRepository());
  const service = new DraftStudioService(sources, new SafetyService());
  return { sources, service };
}

const fixed = new Date('2026-01-01T00:00:00.000Z');

describe('DraftStudioService', () => {
  it('produces a reviewed ContentOutput from a source', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Sleep and memory',
      abstract: 'rest helps recall',
      tags: ['neuro'],
    });
    const out = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'peers' },
      fixed,
    );

    expect(out.id).toMatch(/^co_/);
    expect(out.sourceId).toBe(src.id);
    expect(out.channel).toBe('linkedin');
    expect(out.audience).toBe('peers');
    expect(out.status).toBe('reviewed');
    expect(out.body).toContain('Sleep and memory');
    expect(out.reviewState?.reviewedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(out.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('uses a provided idea hook/angle in the body', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X' });
    const out = await service.create(
      {
        sourceId: src.id,
        channel: 'threads',
        audience: 'students',
        idea: { hook: 'Did you know?', angle: 'memory tricks' },
      },
      fixed,
    );
    expect(out.body).toContain('Did you know?');
    expect(out.body).toContain('memory tricks');
  });

  it('flags unsafe content in the reviewState', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'This drug cures everything',
      abstract: 'guaranteed 100% effective',
    });
    const out = await service.create(
      { sourceId: src.id, channel: 'linkedin', audience: 'public' },
      fixed,
    );
    expect(out.reviewState?.cleared).toBe(false);
    expect(out.reviewState?.findings.length).toBeGreaterThan(0);
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
});
