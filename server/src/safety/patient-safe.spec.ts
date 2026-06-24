import { SafetyFinding } from '../domain/academic';
import {
  MEDICAL_DISCLAIMER,
  escalateForAudience,
  isPatientFacing,
} from './patient-safe';

const finding = (
  severity: SafetyFinding['severity'],
  category: SafetyFinding['category'],
): SafetyFinding => ({ severity, category, message: 'test' });

describe('isPatientFacing', () => {
  it('is true for patients and public, false otherwise', () => {
    expect(isPatientFacing('patients')).toBe(true);
    expect(isPatientFacing('public')).toBe(true);
    expect(isPatientFacing('peers')).toBe(false);
    expect(isPatientFacing('students')).toBe(false);
  });
});

describe('MEDICAL_DISCLAIMER', () => {
  it('states it is not medical advice', () => {
    expect(MEDICAL_DISCLAIMER.toLowerCase()).toContain('not medical advice');
  });
});

describe('escalateForAudience', () => {
  it('raises warn causal-language / unproven-treatment to block for patient-facing audiences', () => {
    const findings = [finding('warn', 'causal-language'), finding('warn', 'unproven-treatment')];
    const result = escalateForAudience(findings, 'patients');
    expect(result.every((f) => f.severity === 'block')).toBe(true);
  });

  it('leaves other categories and severities unchanged', () => {
    const findings = [finding('warn', 'overclaiming'), finding('info', 'causal-language')];
    const result = escalateForAudience(findings, 'public');
    expect(result.map((f) => f.severity)).toEqual(['warn', 'info']);
  });

  it('does not escalate for non-patient-facing audiences', () => {
    const findings = [finding('warn', 'causal-language')];
    expect(escalateForAudience(findings, 'peers')).toEqual(findings);
    expect(escalateForAudience(findings, 'students')).toEqual(findings);
  });
});
