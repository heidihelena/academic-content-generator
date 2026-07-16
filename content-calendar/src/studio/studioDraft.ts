import { isPatientFacing, MEDICAL_DISCLAIMER } from './studioReview';
import type { StudioAudience, StudioInput } from './studioTypes';

const LINKEDIN_AUDIENCE_LEAD: Record<StudioAudience, string> = {
  peers: 'A few notes for research peers:',
  students: 'A quick teaching note:',
  patients: 'Plain-language note:',
  public: 'Plain-language note:',
};

const LINKEDIN_AUDIENCE_CLOSE: Record<StudioAudience, string> = {
  peers:
    'What I would value from colleagues: does this match what you see in your methods, populations or settings?',
  students: 'Useful question to take into class: what would you need to know before trusting this claim?',
  patients: 'A useful next question for a clinician: does this apply to my situation?',
  public: 'What I would watch next: whether this finding holds across different places, groups and settings.',
};

function compactMaterial(material: string, max = 520): string {
  const compact = material.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  const slice = compact.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
  if (sentenceEnd > 160) return `${slice.slice(0, sentenceEnd + 1).trim()}...`;
  return `${slice.trim()}...`;
}

function composeLinkedInDraft(input: StudioInput, title: string, material: string, hook: string): string {
  const gist = compactMaterial(material);
  const lines = [
    hook,
    '',
    title,
    '',
    LINKEDIN_AUDIENCE_LEAD[input.audience],
  ];
  if (gist) lines.push(gist);
  lines.push('', LINKEDIN_AUDIENCE_CLOSE[input.audience]);
  if (isPatientFacing(input.audience)) {
    lines.push('', MEDICAL_DISCLAIMER);
  }
  return lines.join('\n');
}

/**
 * Deterministic, local draft assembly from the Compose inputs — mirrors the
 * server's Draft Studio composer so the flow works offline. For patient-facing
 * audiences the not-medical-advice disclaimer is appended.
 */
export function composeDraft(input: StudioInput): string {
  const title = input.title.trim();
  const material = input.material.trim();
  const hook = input.hook.trim() || `New from our work: ${title}`;
  const gist = compactMaterial(material, 280);

  if (input.channel === 'linkedin') {
    return composeLinkedInDraft(input, title, material, hook);
  }

  const lines = [hook, '', `${title}.`];
  if (gist) lines.push('', gist);
  if (isPatientFacing(input.audience)) {
    lines.push('', MEDICAL_DISCLAIMER);
  }
  return lines.join('\n');
}
