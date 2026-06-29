import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Provide a deterministic "now" for tests that depend on the current week.
// 2026-06-15 is a Monday, which keeps week-boundary math easy to reason about.
export const FIXED_NOW = new Date('2026-06-17T09:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  // Reset the hash router between tests so a navigation in one test doesn't
  // leak into the next (which renders its own `initialView`).
  window.location.hash = '';
});
