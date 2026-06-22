import { buildClipArgs, buildClipCommand, buildDownloadCommand, clipDuration } from './ffmpeg';

describe('clipDuration', () => {
  it('computes a non-negative duration', () => {
    expect(clipDuration(10, 35)).toBe(25);
    expect(clipDuration(35, 10)).toBe(0);
  });
});

describe('buildClipArgs', () => {
  const args = buildClipArgs({ input: 'source.mp4', output: 'clip.mp4', startSeconds: 90, endSeconds: 132 });

  it('fast-seeks before input and cuts by duration', () => {
    // -ss must come before -i for a fast seek; -t carries the duration.
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'));
    expect(args[args.indexOf('-ss') + 1]).toBe('90');
    expect(args[args.indexOf('-t') + 1]).toBe('42');
  });

  it('reframes to vertical 1080x1920 (scale-to-cover + crop)', () => {
    const vf = args[args.indexOf('-vf') + 1];
    expect(vf).toContain('scale=1080:1920:force_original_aspect_ratio=increase');
    expect(vf).toContain('crop=1080:1920');
  });

  it('honors a custom aspect', () => {
    const a = buildClipArgs({ input: 'i', output: 'o', startSeconds: 0, endSeconds: 5, width: 720, height: 1280 });
    expect(a[a.indexOf('-vf') + 1]).toContain('crop=720:1280');
  });
});

describe('command strings', () => {
  it('quotes URLs and builds a yt-dlp download command', () => {
    const cmd = buildDownloadCommand('https://youtu.be/abc?t=1', 'source.mp4');
    expect(cmd).toMatch(/^yt-dlp /);
    expect(cmd).toContain('"https://youtu.be/abc?t=1"');
  });

  it('builds a printable ffmpeg command', () => {
    const cmd = buildClipCommand({ input: 'source.mp4', output: 'clip.mp4', startSeconds: 1, endSeconds: 2 });
    expect(cmd).toMatch(/^ffmpeg /);
    expect(cmd).toContain('-movflags +faststart');
  });
});
