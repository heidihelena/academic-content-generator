/**
 * Date helpers for the weekly calendar.
 *
 * All functions are pure and timezone-aware to the user's local zone (the
 * browser's). We deliberately avoid a date library to keep the dependency
 * surface small and the logic explicit/testable.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Returns a new Date at local midnight for the given date. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the Monday (local midnight) of the week containing `date`.
 * We use Monday-start weeks, which is the norm for content planning.
 */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sun … 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

/** Returns the 7 day-start Dates (Mon..Sun) for the week containing `date`. */
export function getWeekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY_MS));
}

/** Adds `weeks` (can be negative) and returns the new week's Monday. */
export function addWeeks(date: Date, weeks: number): Date {
  return new Date(startOfWeek(date).getTime() + weeks * 7 * DAY_MS);
}

/** True when both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** ISO week number (1..53), used for "posts per week" analytics grouping. */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

/** Formats a week range like "Jun 15 – 21, 2026". */
export function formatWeekRange(date: Date): string {
  const days = getWeekDays(date);
  const first = days[0];
  const last = days[6];
  const monthFmt: Intl.DateTimeFormatOptions = { month: 'short' };
  const firstMonth = first.toLocaleDateString('en-US', monthFmt);
  const lastMonth = last.toLocaleDateString('en-US', monthFmt);
  const year = last.getFullYear();
  if (firstMonth === lastMonth) {
    return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${year}`;
  }
  return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${year}`;
}

/** Formats a time like "9:00 AM" from an ISO string. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Formats a full date+time like "Mon, Jun 15 · 9:00 AM". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} · ${formatTime(iso)}`;
}

/**
 * Converts an ISO datetime to the `value` format expected by
 * <input type="datetime-local"> (local time, no timezone suffix).
 */
export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Parses a <input type="datetime-local"> value back into an ISO string. */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

/** Long weekday name, e.g. "Monday", from a 0-based Mon..Sun index. */
export function weekdayName(mondayBasedIndex: number): string {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names[mondayBasedIndex] ?? '';
}
