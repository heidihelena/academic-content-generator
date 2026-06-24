import { coverArtDataUrl, generateCoverArt } from './cover-art';

describe('generateCoverArt', () => {
  const opts = { accent: '#8B6FC9', bg: 'navy' as const, seed: 'src_123' };

  it('produces an SVG in the accent colour', () => {
    const svg = generateCoverArt(opts);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('#8B6FC9');
    expect(svg).toContain('width="1080"');
  });

  it('is deterministic for the same seed and differs for another', () => {
    expect(generateCoverArt(opts)).toBe(generateCoverArt(opts));
    expect(generateCoverArt(opts)).not.toBe(generateCoverArt({ ...opts, seed: 'other' }));
  });

  it('builds a self-contained data URL', () => {
    expect(coverArtDataUrl(opts).startsWith('data:image/svg+xml,')).toBe(true);
  });
});
