import { describe, expect, it } from 'vitest';
import { extractKeyPoints } from '../src/sources/keyPoints';

describe('extractKeyPoints', () => {
  it('returns all sentences when there are few', () => {
    expect(extractKeyPoints('One finding. Another point.')).toEqual(['One finding.', 'Another point.']);
  });

  it('prefers quantitative and evidence sentences, in original order', () => {
    const text = [
      'We studied urban heat in three cities.',
      'The weather was pleasant during fieldwork.',
      'Tree cover was associated with a 2.1°C reduction in street temperature (n = 412).',
      'Our office is near the park.',
      'The effect may be smaller in coastal areas, an open question for future work.',
      'Lunch was provided.',
      'Results suggest equity-targeted planting could narrow the exposure gap by 30%.',
    ].join(' ');
    const points = extractKeyPoints(text, 3);
    expect(points).toHaveLength(3);
    expect(points[0]).toContain('2.1');
    expect(points[1]).toContain('open question');
    expect(points[2]).toContain('30%');
  });

  it('handles empty text', () => {
    expect(extractKeyPoints('')).toEqual([]);
  });
});
