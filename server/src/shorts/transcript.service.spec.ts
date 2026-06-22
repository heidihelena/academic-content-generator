import {
  decodeEntities,
  extractVideoId,
  formatClock,
  parseTimedText,
  toTimestampedTranscript,
} from './transcript.service';

describe('extractVideoId', () => {
  it('handles watch, youtu.be, shorts and embed URLs', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('accepts a bare 11-char id and rejects junk', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://example.com/not-a-video')).toBeNull();
    expect(extractVideoId('')).toBeNull();
  });
});

describe('decodeEntities', () => {
  it('decodes the entities YouTube uses', () => {
    expect(decodeEntities('trees &amp; heat &#39;equity&#39; &quot;gap&quot;')).toBe(
      'trees & heat \'equity\' "gap"',
    );
    expect(decodeEntities('a &#160;b')).toBe('a  b');
  });
});

describe('parseTimedText', () => {
  const xml =
    '<?xml version="1.0"?><transcript>' +
    '<text start="0.0" dur="3.2">Welcome back</text>' +
    '<text start="12.84" dur="4.1">We found a &amp; gap</text>' +
    '<text start="75.5" dur="2">Why it matters</text>' +
    '</transcript>';

  it('parses cues with floored start seconds and decoded text', () => {
    const cues = parseTimedText(xml);
    expect(cues).toEqual([
      { start: 0, text: 'Welcome back' },
      { start: 12, text: 'We found a & gap' },
      { start: 75, text: 'Why it matters' },
    ]);
  });

  it('returns [] for XML with no cues', () => {
    expect(parseTimedText('<transcript></transcript>')).toEqual([]);
  });
});

describe('formatClock + toTimestampedTranscript', () => {
  it('formats seconds and renders timestamped lines', () => {
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3723)).toBe('1:02:03');
    const lines = toTimestampedTranscript([
      { start: 0, text: 'Intro' },
      { start: 75, text: 'Main point' },
    ]);
    expect(lines).toBe('0:00 Intro\n1:15 Main point');
  });
});
