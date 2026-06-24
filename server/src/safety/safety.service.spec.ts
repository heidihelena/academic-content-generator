import { SafetyService } from './safety.service';

describe('SafetyService', () => {
  const svc = new SafetyService();
  const fixed = new Date('2026-01-01T00:00:00.000Z');

  it('combines claims and safety findings into one ReviewState', () => {
    const result = svc.review('This drug cures cancer in 90% of patients.', fixed);
    expect(result.reviewedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.findings.length).toBeGreaterThan(0); // "cures" -> overclaiming
    expect(result.claims.length).toBeGreaterThan(0); // "90%" -> quantitative claim
    expect(result.cleared).toBe(false); // a block-severity finding is present
  });

  it('clears clean academic copy', () => {
    const result = svc.review('We interviewed twelve volunteers about their sleep.', fixed);
    expect(result.findings).toEqual([]);
    expect(result.claims).toEqual([]);
    expect(result.cleared).toBe(true);
  });

  it('defaults reviewedAt to the current time when no clock is passed', () => {
    const result = svc.review('hello world');
    expect(result.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
