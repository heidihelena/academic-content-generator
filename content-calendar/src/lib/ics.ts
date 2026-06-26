import type { Post } from '../types';
import type { CalendarEntry } from '../content/contentTypes';
import { getPlatformMeta } from './platforms';
import { sourceUrl } from './evidence';

/**
 * iCalendar (.ics) export.
 *
 * Academics live in their institutional calendars; exporting the content plan as
 * .ics lets them drop their posting schedule alongside teaching, grants and
 * conferences. RFC 5545 — CRLF line endings, escaped text, folded long lines.
 */

/** Format a Date as a UTC iCal timestamp: 20260622T090000Z. */
function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escape text per RFC 5545 (backslash, semicolon, comma, newlines). */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold content lines to 75 octets with a leading space on continuations. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    chunks.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) chunks.push(' ' + rest);
  return chunks.join('\r\n');
}

/** A short, single-line summary for a post's calendar event. */
function summaryFor(post: Post): string {
  const platform = getPlatformMeta(post.platform).name;
  const firstLine = post.body.split('\n')[0].trim();
  const snippet = firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine || '(no copy yet)';
  return `${platform}: ${snippet}`;
}

/** Build the event description: full copy plus a linked source when present. */
function descriptionFor(post: Post): string {
  const lines = [post.body];
  const url = sourceUrl(post.source);
  if (url) lines.push('', `Source: ${url}`);
  if (post.evidenceLevel) lines.push(`Evidence: ${post.evidenceLevel}`);
  return lines.join('\n');
}

/** The minimal data one VEVENT needs — the shape both exporters map to. */
interface IcsEvent {
  uid: string;
  scheduledAt: string;
  summary: string;
  description: string;
}

/**
 * Wrap events in a VCALENDAR. Each becomes a 30-minute VEVENT at its scheduled
 * time. Pass `now` for a deterministic DTSTAMP in tests. The single place the
 * RFC 5545 details (folding, escaping, UTC stamps) live.
 */
function buildCalendar(events: IcsEvent[], now: Date): string {
  const stamp = toIcsDate(now.toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Content Calendar//Academic//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const event of events) {
    const start = toIcsDate(event.scheduledAt);
    const end = toIcsDate(new Date(new Date(event.scheduledAt).getTime() + 30 * 60_000).toISOString());
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}@content-calendar`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      fold(`SUMMARY:${escapeText(event.summary)}`),
      fold(`DESCRIPTION:${escapeText(event.description)}`),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Build a VCALENDAR string from posts (legacy Post model). Each post becomes a
 * 30-minute event at its scheduled time.
 */
export function buildIcs(posts: Post[], now: Date = new Date()): string {
  return buildCalendar(
    posts.map((post) => ({
      uid: post.id,
      scheduledAt: post.scheduledAt,
      summary: summaryFor(post),
      description: descriptionFor(post),
    })),
    now,
  );
}

/**
 * Build a VCALENDAR from scheduled content-calendar entries (the ContentVariant
 * model). One 30-minute event per scheduled variant.
 */
export function buildContentIcs(entries: CalendarEntry[], now: Date = new Date()): string {
  return buildCalendar(
    entries.map((e) => ({
      uid: e.variantId,
      scheduledAt: e.scheduledAt,
      summary: `${e.channel}: ${e.title}`,
      description: [
        e.title,
        `Channel: ${e.channel} · ${e.format}`,
        `Audience: ${e.audience}`,
        `Status: ${e.status}`,
      ].join('\n'),
    })),
    now,
  );
}

/**
 * Trigger a browser download of the posts as an .ics file. No-ops outside a DOM
 * (e.g. SSR/tests). Returns the generated calendar string for convenience.
 */
export function downloadIcs(posts: Post[], filename = 'content-calendar.ics'): string {
  return triggerDownload(buildIcs(posts), filename);
}

/** Trigger a browser download of scheduled content entries as an .ics file. */
export function downloadContentIcs(
  entries: CalendarEntry[],
  filename = 'content-calendar.ics',
): string {
  return triggerDownload(buildContentIcs(entries), filename);
}

/** Shared blob-download mechanics. No-ops outside a DOM (SSR/tests). */
function triggerDownload(ics: string, filename: string): string {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return ics;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return ics;
}
