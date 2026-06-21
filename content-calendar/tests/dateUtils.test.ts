import { describe, expect, it } from 'vitest';
import {
  addWeeks,
  formatWeekRange,
  fromDateTimeLocalValue,
  getISOWeek,
  getWeekDays,
  isSameDay,
  startOfWeek,
  toDateTimeLocalValue,
} from '../src/lib/dateUtils';

describe('dateUtils', () => {
  it('startOfWeek returns the Monday of the week', () => {
    // 2026-06-17 is a Wednesday.
    const wed = new Date('2026-06-17T15:30:00');
    const monday = startOfWeek(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(15);
    expect(monday.getHours()).toBe(0);
  });

  it('getWeekDays returns 7 consecutive days starting Monday', () => {
    const days = getWeekDays(new Date('2026-06-17T00:00:00'));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0); // Sunday
    expect(days[6].getDate() - days[0].getDate()).toBe(6);
  });

  it('addWeeks moves the anchor by whole weeks', () => {
    const next = addWeeks(new Date('2026-06-17T00:00:00'), 1);
    expect(next.getDate()).toBe(22); // Monday of the following week
  });

  it('isSameDay ignores time-of-day', () => {
    expect(isSameDay(new Date('2026-06-17T01:00:00'), new Date('2026-06-17T23:00:00'))).toBe(true);
    expect(isSameDay(new Date('2026-06-17T01:00:00'), new Date('2026-06-18T01:00:00'))).toBe(false);
  });

  it('getISOWeek computes the ISO week number', () => {
    expect(getISOWeek(new Date('2026-06-17T00:00:00'))).toBe(25);
    expect(getISOWeek(new Date('2026-01-01T00:00:00'))).toBe(1);
  });

  it('formatWeekRange renders a human range', () => {
    expect(formatWeekRange(new Date('2026-06-17T00:00:00'))).toBe('Jun 15 – 21, 2026');
  });

  it('datetime-local round-trips through ISO', () => {
    const iso = new Date('2026-06-17T09:30:00').toISOString();
    const local = toDateTimeLocalValue(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDateTimeLocalValue(local)).toBe(iso);
  });
});
