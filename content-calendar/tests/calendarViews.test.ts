import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  formatMonthLabel,
  getMonthMatrix,
  isSameMonth,
} from '../src/lib/calendarViews';

describe('calendarViews', () => {
  it('getMonthMatrix returns 6 Monday-start weeks covering the month', () => {
    const grid = getMonthMatrix(new Date('2026-06-17T00:00:00'));
    expect(grid).toHaveLength(6);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    // Monday-start: first column is a Monday.
    expect(grid[0][0].getDay()).toBe(1);
    // June 2026 starts on a Monday, so the grid's first day is June 1.
    expect(grid[0][0].getDate()).toBe(1);
    expect(grid[0][0].getMonth()).toBe(5); // June
    // The month's days all appear somewhere in the grid.
    const flat = grid.flat();
    expect(flat.some((d) => isSameMonth(d, new Date('2026-06-15')) && d.getDate() === 30)).toBe(true);
  });

  it('addDays / addMonths move the anchor', () => {
    expect(addDays(new Date('2026-06-17T10:00:00'), 5).getDate()).toBe(22);
    expect(addMonths(new Date('2026-06-17'), 1).getMonth()).toBe(6); // July
    expect(addMonths(new Date('2026-01-15'), -1).getMonth()).toBe(11); // Dec (prev year)
  });

  it('formatMonthLabel renders month + year', () => {
    expect(formatMonthLabel(new Date('2026-06-17'))).toBe('June 2026');
  });
});
