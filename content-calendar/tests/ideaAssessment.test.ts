import { describe, expect, it } from 'vitest';
import { assessIdea } from '../src/idea-lab/ideaAssessment';

describe('assessIdea', () => {
  it('grades benign material for peers as low risk without flags', () => {
    const a = assessIdea({ channel: 'linkedin', audience: 'peers' }, 'Reflections on a year of fieldwork.');
    expect(a).toEqual({ riskLevel: 'low', citationNeed: false, safetyNeed: false });
  });

  it('requires citations for quantitative claims', () => {
    const a = assessIdea({ channel: 'linkedin', audience: 'peers' }, 'The intervention reduced admissions by 24%.');
    expect(a.citationNeed).toBe(true);
  });

  it('flags patient-facing ideas for safety review', () => {
    const a = assessIdea({ channel: 'teaching', audience: 'patients' }, 'Notes on sleep hygiene.');
    expect(a.safetyNeed).toBe(true);
  });

  it('marks material with blocking findings as high risk', () => {
    const a = assessIdea({ channel: 'newsletter', audience: 'peers' }, 'This treatment cures the disease.');
    expect(a.riskLevel).toBe('high');
    expect(a.safetyNeed).toBe(true);
  });
});
