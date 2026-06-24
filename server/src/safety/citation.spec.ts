import { claimsNeedingCitation, detectClaims } from './citation';

describe('detectClaims', () => {
  it('flags a quantitative assertion as needing a citation', () => {
    const claims = detectClaims('Half of all patients recovered within 30% faster.');
    expect(claims).toHaveLength(1);
    expect(claims[0].needsCitation).toBe(true);
    expect(claims[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('flags an evidence-verb statement', () => {
    const claims = detectClaims('Recent studies show a clear benefit for early treatment.');
    expect(claims).toHaveLength(1);
    expect(claims[0].needsCitation).toBe(true);
  });

  it('flags causal language', () => {
    const claims = detectClaims('The drug reduces inflammation markedly.');
    expect(claims).toHaveLength(1);
    expect(claims[0].confidence).toBeCloseTo(0.6);
  });

  it('does not flag a claim that already carries a citation', () => {
    const claims = detectClaims('The therapy cut mortality by 20% (Smith et al., 2021).');
    expect(claims).toHaveLength(1);
    expect(claims[0].needsCitation).toBe(false);
  });

  it('recognises a bracketed numeric reference as a citation', () => {
    const claims = detectClaims('Outcomes improved in 40% of cases [3].');
    expect(claims[0].needsCitation).toBe(false);
  });

  it('ignores sentences that make no empirical claim', () => {
    expect(detectClaims('I am excited to share our new paper today.')).toEqual([]);
  });

  it('handles multiple sentences and empty input', () => {
    const body =
      'Our lab studied sleep. The intervention increases alertness. We had fun.';
    const claims = detectClaims(body);
    expect(claims).toHaveLength(1);
    expect(claims[0].text).toContain('increases alertness');
    expect(detectClaims('')).toEqual([]);
  });
});

describe('claimsNeedingCitation', () => {
  it('returns only the uncited claims', () => {
    const body =
      'Risk fell by 50% (Lee, 2020). A separate analysis found a strong effect.';
    const flagged = claimsNeedingCitation(body);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].text).toContain('separate analysis');
  });
});
