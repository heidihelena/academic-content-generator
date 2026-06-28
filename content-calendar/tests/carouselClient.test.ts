import { describe, expect, it } from 'vitest';
import { LocalCarouselClient, type CarouselSeed } from '../src/carousel/carouselClient';

const seed: CarouselSeed = {
  id: 'src_heat',
  title: 'Street trees and urban heat',
  material:
    'Tree cover is associated with cooler streets. Canopy reduces surface temperature. ' +
    'Shaded blocks see fewer heat-related ER visits. Equity gaps persist across neighborhoods. ' +
    'A fifth sentence that should be dropped.',
};

describe('LocalCarouselClient', () => {
  it('builds a cover → points → CTA deck capped at four points', async () => {
    const { deck } = await new LocalCarouselClient().generate(seed);
    expect(deck.slides[0].type).toBe('cover');
    expect(deck.slides[deck.slides.length - 1].type).toBe('cta');
    const points = deck.slides.filter((s) => s.type === 'point');
    expect(points).toHaveLength(4); // fifth sentence dropped
    // cover + 4 points + cta
    expect(deck.slides).toHaveLength(6);
  });

  it('carries brand knobs and a hashtagged caption', async () => {
    const { deck } = await new LocalCarouselClient().generate({ ...seed, bg: 'navy', url: 'forskai.com' });
    expect(deck.bg).toBe('navy');
    expect(deck.url).toBe('forskai.com');
    expect(deck.theme).toBe('vahtian');
    expect(deck.caption).toContain('→ forskai.com');
    expect(deck.caption).toContain('#vahtian');
    expect(deck.label).toBe('Street trees and urban heat');
  });

  it('shortens overlong slide titles with an ellipsis', async () => {
    const long = `${'x'.repeat(200)}.`;
    const { deck } = await new LocalCarouselClient().generate({ ...seed, material: long });
    const point = deck.slides.find((s) => s.type === 'point')!;
    expect(point.title.length).toBeLessThanOrEqual(88);
    expect(point.title.endsWith('…')).toBe(true);
  });

  it('returns a safety review that blocks overclaiming slide text', async () => {
    const { review } = await new LocalCarouselClient().generate({
      ...seed,
      title: 'This cures disease',
      material: 'It cures everything and guarantees results.',
    });
    expect(review.cleared).toBe(false);
    expect(review.findings.some((f) => f.severity === 'block')).toBe(true);
  });

  it('clears a plainly-worded deck and is deterministic', async () => {
    const a = await new LocalCarouselClient().generate(seed);
    const b = await new LocalCarouselClient().generate(seed);
    expect(a).toEqual(b);
    expect(a.review.cleared).toBe(true);
  });

  it('copes with empty material (cover + CTA only)', async () => {
    const { deck } = await new LocalCarouselClient().generate({ id: 's', title: 'T', material: '   ' });
    expect(deck.slides.map((s) => s.type)).toEqual(['cover', 'cta']);
  });
});
