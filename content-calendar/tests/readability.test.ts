import { describe, expect, it } from 'vitest';
import { analyzeReadability, countSyllables, readabilityVerdict } from '../src/lib/readability';

describe('readability', () => {
  it('counts syllables with a reasonable heuristic', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('table')).toBe(2);
    expect(countSyllables('heterogeneity')).toBeGreaterThanOrEqual(5);
  });

  it('rates simple, short sentences as accessible', () => {
    const r = analyzeReadability('We found that more trees keep a street cool. This helps people on hot days.');
    expect(r.wordCount).toBeGreaterThan(10);
    expect(readabilityVerdict(r).tone).toBe('good');
  });

  it('flags dense, jargon-heavy academic prose and surfaces complex words', () => {
    const r = analyzeReadability(
      'The heterogeneity of microclimatic attenuation demonstrates considerable socioeconomic stratification across metropolitan agglomerations.',
    );
    expect(readabilityVerdict(r).tone).toBe('warn');
    expect(r.complexWords).toContain('heterogeneity');
  });

  it('ignores URLs and handles when scoring', () => {
    const r = analyzeReadability('Read it here https://doi.org/10.1/x via @someone #openaccess');
    // Only "Read it here via" count — the URL, @mention and #hashtag are ignored.
    expect(r.wordCount).toBe(4);
    expect(readabilityVerdict(r).tone).toBe('empty');
  });
});
