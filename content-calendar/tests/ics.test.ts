import { describe, expect, it } from 'vitest';
import { buildIcs } from '../src/lib/ics';
import type { Post } from '../src/types';

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    platform: 'bluesky',
    body: 'New paper out today.',
    scheduledAt: '2026-06-22T09:00:00.000Z',
    status: 'scheduled',
    media: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildIcs', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');

  it('wraps events in a VCALENDAR with one VEVENT per post', () => {
    const ics = buildIcs([post({ id: 'a' }), post({ id: 'b' })], now);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics.trimEnd()).toMatch(/END:VCALENDAR$/);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(ics).toContain('UID:a@content-calendar');
  });

  it('formats DTSTART as a UTC iCal timestamp and adds a 30-min DTEND', () => {
    const ics = buildIcs([post()], now);
    expect(ics).toContain('DTSTART:20260622T090000Z');
    expect(ics).toContain('DTEND:20260622T093000Z');
  });

  it('uses CRLF line endings', () => {
    expect(buildIcs([post()], now)).toContain('\r\n');
  });

  it('includes a linked source and evidence level in the description', () => {
    const ics = buildIcs(
      [post({ source: { doi: '10.1038/abc' }, evidenceLevel: 'peer_reviewed' })],
      now,
    );
    // Unfold continuation lines ("\r\n " ) before checking logical content.
    const unfolded = ics.replace(/\r\n[ \t]/g, '');
    expect(unfolded).toContain('https://doi.org/10.1038/abc');
    expect(unfolded).toContain('Evidence: peer_reviewed');
  });

  it('escapes commas in the summary text', () => {
    const ics = buildIcs([post({ body: 'Trees, heat, and equity' })], now);
    expect(ics).toContain('Trees\\, heat\\, and equity');
  });
});
