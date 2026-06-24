import { describe, expect, it } from 'vitest';
import {
  MEDICAL_DISCLAIMER,
  isPatientFacing,
  reviewDraft,
} from '../src/studio/studioReview';

describe('studio review', () => {
  it('blocks absolute efficacy claims', () => {
    const r = reviewDraft('This drug cures everything.', 'peers');
    expect(r.findings.some((f) => f.category === 'overclaiming' && f.severity === 'block')).toBe(true);
    expect(r.cleared).toBe(false);
  });

  it('flags an uncited quantitative claim, but not a cited one', () => {
    expect(reviewDraft('Risk fell by 40%.', 'peers').claims.some((c) => c.needsCitation)).toBe(true);
    expect(
      reviewDraft('Risk fell by 40% (Lee, 2020).', 'peers').claims.every((c) => !c.needsCitation),
    ).toBe(true);
  });

  it('escalates causal warnings to block for patient-facing audiences', () => {
    expect(reviewDraft('Coffee causes weight loss.', 'peers').cleared).toBe(true);
    expect(reviewDraft('Coffee causes weight loss.', 'public').cleared).toBe(false);
  });

  it('clears clean academic copy', () => {
    expect(reviewDraft('We interviewed twelve volunteers about their sleep.', 'peers').cleared).toBe(true);
  });

  it('identifies patient-facing audiences and exposes a disclaimer', () => {
    expect(isPatientFacing('patients')).toBe(true);
    expect(isPatientFacing('public')).toBe(true);
    expect(isPatientFacing('peers')).toBe(false);
    expect(MEDICAL_DISCLAIMER).toMatch(/not medical advice/i);
  });
});
