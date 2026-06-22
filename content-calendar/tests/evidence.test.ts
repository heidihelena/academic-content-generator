import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_META,
  evidenceExpectsSource,
  hasSourceLink,
  normalizeDoi,
  sourceLabel,
  sourceUrl,
} from '../src/lib/evidence';

describe('evidence helpers', () => {
  it('normalizes DOIs from URL and prefixed forms', () => {
    expect(normalizeDoi('https://doi.org/10.1038/abc')).toBe('10.1038/abc');
    expect(normalizeDoi('http://dx.doi.org/10.1/x')).toBe('10.1/x');
    expect(normalizeDoi('doi: 10.5/y')).toBe('10.5/y');
    expect(normalizeDoi('10.7/z')).toBe('10.7/z');
    expect(normalizeDoi('  ')).toBeUndefined();
    expect(normalizeDoi(undefined)).toBeUndefined();
  });

  it('builds a resolvable URL, preferring an explicit url over the DOI', () => {
    expect(sourceUrl({ doi: '10.1/x' })).toBe('https://doi.org/10.1/x');
    expect(sourceUrl({ url: 'https://osf.io/x', doi: '10.1/x' })).toBe('https://osf.io/x');
    expect(sourceUrl({})).toBeUndefined();
    expect(sourceUrl(undefined)).toBeUndefined();
  });

  it('detects whether a source carries a link', () => {
    expect(hasSourceLink({ doi: '10.1/x' })).toBe(true);
    expect(hasSourceLink({ url: 'https://x' })).toBe(true);
    expect(hasSourceLink({ title: 'No link' })).toBe(false);
    expect(hasSourceLink(undefined)).toBe(false);
  });

  it('labels a source by venue/year, then title, then identifier', () => {
    expect(sourceLabel({ venue: 'Nature', year: 2026 })).toBe('Nature · 2026');
    expect(sourceLabel({ title: 'A study' })).toBe('A study');
    expect(sourceLabel({ doi: '10.1/x' })).toBe('10.1/x');
    expect(sourceLabel(undefined)).toBe('Source');
  });

  it('flags evidence levels that should link a source', () => {
    expect(evidenceExpectsSource('peer_reviewed')).toBe(true);
    expect(evidenceExpectsSource('preliminary')).toBe(true);
    expect(evidenceExpectsSource('opinion')).toBe(false);
    expect(evidenceExpectsSource(undefined)).toBe(false);
  });

  it('exposes a label for every evidence level', () => {
    expect(EVIDENCE_META.peer_reviewed.label).toMatch(/peer/i);
    expect(EVIDENCE_META.opinion.label).toMatch(/opinion/i);
  });
});
