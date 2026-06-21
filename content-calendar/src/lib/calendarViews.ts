import { DAY_MS, startOfWeek, startOfDay } from './dateUtils';

/**
 * Pure helpers for the Month/Week/Day calendar views. Kept framework-free and
 * unit-tested so view rendering stays trivial.
 */

/**
 * Returns a Monday-start month matrix (weeks × 7 days) that fully contains the
 * month of `anchor`, padded with leading/trailing days from adjacent months.
 */
export function getMonthMatrix(anchor: Date): Date[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  // Always render 6 weeks (42 cells) for a stable grid height.
  const days: Date[] = Array.from(
    { length: 42 },
    (_, i) => new Date(gridStart.getTime() + i * DAY_MS),
  );
  const weeks: Date[][] = [];
  for (let i = 0; i < 6; i++) weeks.push(days.slice(i * 7, i * 7 + 7));
  return weeks;
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function formatMonthLabel(anchor: Date): string {
  return anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDayLabel(anchor: Date): string {
  return anchor.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Adds whole days (can be negative) to a date, returning local midnight. */
export function addDays(date: Date, days: number): Date {
  return new Date(startOfDay(date).getTime() + days * DAY_MS);
}

/** Adds whole months, clamping the day to the target month's length. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return d;
}
