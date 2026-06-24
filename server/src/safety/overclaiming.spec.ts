import { isCleared } from '../domain/academic';
import { reviewOverclaiming } from './overclaiming';

describe('reviewOverclaiming', () => {
  it('blocks absolute efficacy claims', () => {
    const [finding] = reviewOverclaiming('This therapy cures the disease.');
    expect(finding.category).toBe('overclaiming');
    expect(finding.severity).toBe('block');
    expect(finding.span).toEqual({ start: 13, end: 18 });
  });

  it('warns on causal language', () => {
    const findings = reviewOverclaiming('Coffee causes weight loss.');
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('causal-language');
    expect(findings[0].severity).toBe('warn');
  });

  it('blocks specific dosage instructions', () => {
    const findings = reviewOverclaiming('Take 500 mg every morning to feel better.');
    expect(findings.some((f) => f.category === 'dosage' && f.severity === 'block')).toBe(true);
  });

  it('warns on unproven / immune-boost claims', () => {
    const findings = reviewOverclaiming('This supplement boosts immunity.');
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('unproven-treatment');
  });

  it('blocks identifiable patient details', () => {
    const findings = reviewOverclaiming('My patient recovered fully after the trial.');
    expect(findings[0].category).toBe('identifiable-patient');
    expect(findings[0].severity).toBe('block');
  });

  it('passes clean academic copy with no findings', () => {
    expect(reviewOverclaiming('We studied sleep patterns in a cohort of volunteers.')).toEqual([]);
  });

  it('returns findings ordered by position', () => {
    const findings = reviewOverclaiming('Coffee causes harm, but this miracle pill is completely safe.');
    const starts = findings.map((f) => f.span?.start ?? -1);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });

  it('reports as not cleared when a block finding is present', () => {
    expect(isCleared(reviewOverclaiming('This drug cures everything.'))).toBe(false);
    expect(isCleared(reviewOverclaiming('Coffee causes alertness.'))).toBe(true);
  });
});
