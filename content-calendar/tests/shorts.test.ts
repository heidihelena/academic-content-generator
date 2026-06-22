import { describe, expect, it } from 'vitest';
import {
  formatTimestamp,
  parseTimestamp,
  parseTranscript,
  planShorts,
  splitPlainText,
  toTitle,
} from '../src/lib/shorts';

describe('timestamps', () => {
  it('parses M:SS, MM:SS and H:MM:SS', () => {
    expect(parseTimestamp('0:14')).toBe(14);
    expect(parseTimestamp('2:05')).toBe(125);
    expect(parseTimestamp('1:02:03')).toBe(3723);
  });

  it('rejects malformed timestamps', () => {
    expect(parseTimestamp('12')).toBeNull();
    expect(parseTimestamp('1:99')).toBeNull();
    expect(parseTimestamp('abc')).toBeNull();
  });

  it('formats seconds back to a clock string', () => {
    expect(formatTimestamp(14)).toBe('0:14');
    expect(formatTimestamp(125)).toBe('2:05');
    expect(formatTimestamp(3723)).toBe('1:02:03');
  });
});

describe('parseTranscript', () => {
  it('parses inline timestamped lines', () => {
    const cues = parseTranscript('0:00 Intro here\n0:30 Main point\n1:15 Wrap up');
    expect(cues).toHaveLength(3);
    expect(cues[1]).toEqual({ start: 30, text: 'Main point' });
  });

  it('handles standalone timestamps with text on the next line', () => {
    const cues = parseTranscript('0:00\nIntro here\n0:30\nMain point');
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ start: 0, text: 'Intro here' });
  });

  it('returns [] when there are no timestamps', () => {
    expect(parseTranscript('just some prose with no times')).toEqual([]);
  });
});

const TIMED = [
  '0:00 Welcome back to the channel today',
  '0:20 We found that urban trees cool poorer streets far less',
  '0:50 The key result is a two degree gap across the city',
  '1:30 Why does this matter for policy and planning',
  '2:10 Here is what city councils should do next',
  '2:45 Thanks for watching and see you next time',
].join('\n');

describe('planShorts', () => {
  it('produces timestamped segments from a timestamped transcript', () => {
    const segs = planShorts(TIMED, 2);
    expect(segs.length).toBeLessThanOrEqual(2);
    for (const s of segs) {
      expect(typeof s.start).toBe('number');
      expect(typeof s.end).toBe('number');
      expect(s.end!).toBeGreaterThan(s.start!);
      expect(s.text.length).toBeGreaterThan(0);
    }
    // Selected windows stay in chronological order.
    expect(segs[0].start!).toBeLessThanOrEqual(segs[segs.length - 1].start!);
  });

  it('falls back to plain-text segments (no times) without timestamps', () => {
    const segs = planShorts(
      'First idea here. Second idea here. Third idea here. Fourth idea here.',
      2,
    );
    expect(segs).toHaveLength(2);
    expect(segs[0].start).toBeUndefined();
  });
});

describe('splitPlainText', () => {
  it('splits sentences into at most N segments', () => {
    const segs = splitPlainText('A. B. C. D. E.', 2);
    expect(segs).toHaveLength(2);
  });
});

describe('toTitle', () => {
  it('condenses to a word boundary with an ellipsis', () => {
    const t = toTitle('This is a very long opening sentence that keeps going well past the limit for sure', 30);
    expect(t.length).toBeLessThanOrEqual(31);
    expect(t.endsWith('…')).toBe(true);
  });
});
