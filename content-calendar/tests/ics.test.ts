import { describe, expect, it } from 'vitest';
import { buildIcs, buildContentIcs } from '../src/lib/ics';
import type { Post } from '../src/types';
import type { CalendarEntry } from '../src/content/contentTypes';

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

describe('buildContentIcs', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');
  function entry(over: Partial<CalendarEntry> = {}): CalendarEntry {
    return {
      variantId: 'cv_1',
      itemId: 'ci_1',
      title: 'Street trees and heat',
      channel: 'linkedin',
      format: 'post',
      audience: 'peers',
      scheduledAt: '2026-06-22T09:00:00.000Z',
      status: 'scheduled',
      exported: false,
      ...over,
    };
  }

  it('emits one VEVENT per scheduled variant with channel-prefixed summary', () => {
    const ics = buildContentIcs([entry({ variantId: 'a' }), entry({ variantId: 'b' })], now);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(ics).toContain('UID:a@content-calendar');
    expect(ics).toContain('SUMMARY:linkedin: Street trees and heat');
    expect(ics).toContain('DTSTART:20260622T090000Z');
    expect(ics).toContain('DTEND:20260622T093000Z');
  });

  it('puts audience and status in the description', () => {
    const unfolded = buildContentIcs([entry()], now).replace(/\r\n[ \t]/g, '');
    expect(unfolded).toContain('Audience: peers');
    expect(unfolded).toContain('Status: scheduled');
  });
});
