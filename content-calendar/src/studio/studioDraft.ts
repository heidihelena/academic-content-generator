import { isPatientFacing, MEDICAL_DISCLAIMER } from './studioReview';
import type { StudioInput } from './studioTypes';

/**
 * Deterministic, local draft assembly from the Compose inputs — mirrors the
 * server's Draft Studio composer so the flow works offline. For patient-facing
 * audiences the not-medical-advice disclaimer is appended.
 */
export function composeDraft(input: StudioInput): string {
  const title = input.title.trim();
  const material = input.material.trim();
  const hook = input.hook.trim() || `New from our work: ${title}`;
  const gist = material.slice(0, 280);

  const lines = [hook, '', `${title}.`];
  if (gist) lines.push('', gist);
  lines.push('', `— for ${input.audience} · ${input.channel}`);
  if (isPatientFacing(input.audience)) {
    lines.push('', MEDICAL_DISCLAIMER);
  }
  return lines.join('\n');
}
