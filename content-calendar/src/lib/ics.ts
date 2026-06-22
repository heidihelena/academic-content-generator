import type { Post } from '../types';
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

/**
 * Build a VCALENDAR string from posts. Each post becomes a 30-minute event at
 * its scheduled time. Pass `now` for deterministic DTSTAMP in tests.
 */
export function buildIcs(posts: Post[], now: Date = new Date()): string {
  const stamp = toIcsDate(now.toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Content Calendar//Academic//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const post of posts) {
    const start = toIcsDate(post.scheduledAt);
    const end = toIcsDate(new Date(new Date(post.scheduledAt).getTime() + 30 * 60_000).toISOString());
    lines.push(
      'BEGIN:VEVENT',
      `UID:${post.id}@content-calendar`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      fold(`SUMMARY:${escapeText(summaryFor(post))}`),
      fold(`DESCRIPTION:${escapeText(descriptionFor(post))}`),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Trigger a browser download of the posts as an .ics file. No-ops outside a DOM
 * (e.g. SSR/tests). Returns the generated calendar string for convenience.
 */
export function downloadIcs(posts: Post[], filename = 'content-calendar.ics'): string {
  const ics = buildIcs(posts);
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
