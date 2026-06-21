import { cosineSimilarity } from './vector-math';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('returns ~0.5 for orthogonal vectors (scaled into [0,1])', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.5);
  });

  it('returns 0 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(0);
  });

  it('returns 0 when either vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('compares only the overlapping length', () => {
    expect(cosineSimilarity([1, 1, 1], [1, 1])).toBeGreaterThan(0.5);
  });
});
