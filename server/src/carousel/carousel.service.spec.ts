import { NotFoundException } from '@nestjs/common';
import { ContentPlanService } from '../content-plan/content-plan.service';
import { SafetyService } from '../safety/safety.service';
import { InMemorySourcesRepository } from '../sources/sources.repository';
import { SourcesService } from '../sources/sources.service';
import { CarouselService } from './carousel.service';

const emptyVault = { listNotes: async () => [], getNote: async () => null } as never;

function setup() {
  const sources = new SourcesService(new InMemorySourcesRepository(), emptyVault);
  const service = new CarouselService(new ContentPlanService(sources), new SafetyService());
  return { sources, service };
}

describe('CarouselService', () => {
  it('generates a deck with a cover (cover art), points and a CTA', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Street trees and urban heat',
      abstract: 'Tree cover was associated with cooler streets. Low-income areas had less of it.',
    });

    const { deck } = await service.generate({ sourceId: src.id, theme: 'citevahti' });

    expect(deck.schema).toBe(1);
    expect(deck.theme).toBe('citevahti');
    const cover = deck.slides[0];
    expect(cover.type).toBe('cover');
    expect(cover.title).toBe('Street trees and urban heat');
    expect(cover.coverArt?.startsWith('data:image/svg+xml,')).toBe(true);
    expect(deck.slides.some((s) => s.type === 'point')).toBe(true);
    expect(deck.slides.at(-1)?.type).toBe('cta');
    expect(deck.caption).toContain('→');
  });

  it('falls back to the vahtian theme for an unknown theme and respects bg/url', async () => {
    const { sources, service } = setup();
    const src = await sources.create({ kind: 'note', title: 'X', abstract: 'A short note.' });
    const { deck } = await service.generate({
      sourceId: src.id,
      theme: 'bogus',
      bg: 'navy',
      url: 'vahtian.com/x',
    });
    expect(deck.theme).toBe('vahtian');
    expect(deck.bg).toBe('navy');
    expect(deck.slides.at(-1)?.url).toBe('vahtian.com/x');
  });

  it('surfaces an overclaim in the shared safety review', async () => {
    const { sources, service } = setup();
    const src = await sources.create({
      kind: 'paper',
      title: 'Our tool proves causation and is 100% accurate',
      abstract: 'A short abstract.',
    });
    const { review } = await service.generate({ sourceId: src.id });
    expect(review.cleared).toBe(false);
    expect(review.findings.some((f) => f.category === 'overclaiming')).toBe(true);
  });

  it('404s for an unknown source', async () => {
    const { service } = setup();
    await expect(service.generate({ sourceId: 'src_missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
