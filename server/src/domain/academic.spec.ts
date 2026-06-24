import {
  AUDIENCES,
  CONTENT_CHANNELS,
  CONTENT_STATUSES,
  SAFETY_CATEGORIES,
  SAFETY_SEVERITIES,
  SOURCE_KINDS,
  SafetyFinding,
  isCleared,
} from './academic';

describe('academic enums', () => {
  it('expose the documented vocabularies', () => {
    expect(SOURCE_KINDS).toEqual(['paper', 'note', 'link', 'lecture']);
    expect(CONTENT_CHANNELS).toEqual([
      'linkedin',
      'threads',
      'instagram',
      'newsletter',
      'teaching',
    ]);
    expect(AUDIENCES).toEqual(['peers', 'students', 'patients', 'public']);
    expect(CONTENT_STATUSES).toEqual([
      'idea',
      'draft',
      'reviewed',
      'scheduled',
      'exported',
    ]);
    expect(SAFETY_SEVERITIES).toEqual(['info', 'warn', 'block']);
    expect(SAFETY_CATEGORIES).toEqual([
      'overclaiming',
      'causal-language',
      'dosage',
      'unproven-treatment',
      'identifiable-patient',
    ]);
  });

  it('have no duplicate values', () => {
    for (const list of [
      SOURCE_KINDS,
      CONTENT_CHANNELS,
      AUDIENCES,
      CONTENT_STATUSES,
      SAFETY_SEVERITIES,
      SAFETY_CATEGORIES,
    ]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });
});

describe('isCleared', () => {
  const finding = (severity: SafetyFinding['severity']): SafetyFinding => ({
    severity,
    category: 'overclaiming',
    message: 'test',
  });

  it('clears when there are no findings', () => {
    expect(isCleared([])).toBe(true);
  });

  it('clears when only info/warn findings are present', () => {
    expect(isCleared([finding('info'), finding('warn')])).toBe(true);
  });

  it('does not clear when a block finding is present', () => {
    expect(isCleared([finding('warn'), finding('block')])).toBe(false);
  });
});
