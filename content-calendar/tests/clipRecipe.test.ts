import { describe, expect, it } from 'vitest';
import { buildClipRecipe } from '../src/lib/clipRecipe';

describe('buildClipRecipe', () => {
  it('builds an ffmpeg render command for a vertical clip', () => {
    const r = buildClipRecipe({ startSeconds: 90, endSeconds: 132, index: 2, videoUrl: 'https://youtu.be/abc' });
    expect(r.filename).toBe('clip-2_90-132.mp4');
    expect(r.durationSeconds).toBe(42);
    expect(r.render).toContain('-ss 90');
    expect(r.render).toContain('-t 42');
    expect(r.render).toContain('crop=1080:1920');
  });

  it('includes a yt-dlp download step only when a URL is given', () => {
    expect(buildClipRecipe({ startSeconds: 0, endSeconds: 5, videoUrl: 'https://x' }).download).toMatch(/^yt-dlp /);
    expect(buildClipRecipe({ startSeconds: 0, endSeconds: 5 }).download).toBeUndefined();
  });

  it('rounds and clamps the range', () => {
    const r = buildClipRecipe({ startSeconds: 9.6, endSeconds: 9.1 });
    expect(r.durationSeconds).toBe(0); // end clamped to >= start
  });
});
