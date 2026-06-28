import { describe, expect, it } from 'vitest';
import { PLATFORMS, PLATFORM_META, getPlatformMeta } from '../src/lib/platforms';
import { PLATFORM_GLYPHS } from '../src/components/icons';
import { analyzeReach } from '../src/lib/reach';

describe('X as a publishing destination', () => {
  it('is listed among the platforms with sane metadata', () => {
    expect(PLATFORMS).toContain('x');
    const meta = getPlatformMeta('x');
    expect(meta).toBe(PLATFORM_META.x);
    expect(meta.name).toBe('X');
    expect(meta.characterLimit).toBe(280);
  });

  it('has a glyph for badges/pickers', () => {
    expect(typeof PLATFORM_GLYPHS.x).toBe('function');
  });

  it('applies the link-in-post reach penalty (X demotes outbound links)', () => {
    const codes = analyzeReach({ platform: 'x', body: 'New paper https://doi.org/10.1/x' }).map((f) => f.code);
    expect(codes).toContain('link-in-post');
  });
});
