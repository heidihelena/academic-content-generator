import { OVERCLAIM_PATTERNS, findOverclaims, overclaimRegex } from './overclaim-terms';

describe('overclaim terms', () => {
  it('builds a valid case-insensitive global regex', () => {
    const re = overclaimRegex();
    expect(re.flags).toContain('g');
    expect(re.flags).toContain('i');
    expect(OVERCLAIM_PATTERNS.length).toBeGreaterThan(0);
  });

  it('finds medical and research/brand overclaims', () => {
    expect(findOverclaims('This drug cures cancer.')).toContain('cures');
    expect(findOverclaims('Our method proves the result and eliminates bias.')).toEqual(
      expect.arrayContaining(['proves', 'eliminates bias']),
    );
    expect(findOverclaims('100% accurate, never wrong.')).toEqual(
      expect.arrayContaining(['100% accurate', 'never wrong']),
    );
  });

  it('returns each phrase once and nothing for clean copy', () => {
    expect(findOverclaims('proves proves proves')).toEqual(['proves']);
    expect(findOverclaims('We interviewed twelve volunteers about their sleep.')).toEqual([]);
  });
});
