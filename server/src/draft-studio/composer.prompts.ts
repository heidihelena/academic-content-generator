import { Audience, ContentChannel } from '../domain/academic';
import { ComposeRequest } from './composer.types';

/** Prompts + JSON schemas for the Claude-backed hook and draft composers. */

const CHANNEL_LIMITS: Record<ContentChannel, number> = {
  linkedin: 3000,
  threads: 500,
  instagram: 2200,
  newsletter: 5000,
  teaching: 5000,
};

function isPatientFacing(audience: Audience): boolean {
  return audience === 'patients' || audience === 'public';
}

const SAFETY_RULES = `Safety rules:
- Never overstate: report associations as associations, not proof. Avoid "cure", "guaranteed", "100% effective".
- No specific dosages or self-treatment instructions.
- Do not present unproven or off-label treatments as established fact.
- No identifiable patient details.`;

export function composerSystemPrompt(audience: Audience): string {
  const plain = isPatientFacing(audience)
    ? `\nThis is for a ${audience} audience: use plain, jargon-free language at roughly an 8th-grade reading level. This is general information, not medical advice — do not give individual advice, diagnosis or treatment direction.`
    : '';
  return `You are a science-communication editor who turns research into accessible, audience-specific content.${plain}\n${SAFETY_RULES}`;
}

export const HOOK_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { hook: { type: 'string' } },
  required: ['hook'],
};

export const DRAFT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { body: { type: 'string' } },
  required: ['body'],
};

export function buildHookUserPrompt(req: ComposeRequest): string {
  return [
    `Channel: ${req.channel}`,
    `Audience: ${req.audience}`,
    `Title: ${req.title}`,
    '',
    'Source material:',
    req.material.trim() || '(none)',
    '',
    'Write ONE compelling opening hook — a single sentence, no hashtags, stating the finding rather than the methods. Respond as JSON: { "hook": string }.',
  ].join('\n');
}

export function buildDraftUserPrompt(req: ComposeRequest): string {
  return [
    `Channel: ${req.channel} (keep within ~${CHANNEL_LIMITS[req.channel]} characters)`,
    `Audience: ${req.audience}`,
    `Title: ${req.title}`,
    req.hook?.trim()
      ? `Open with this hook: ${req.hook.trim()}`
      : 'Open with a plain-language hook stating the finding.',
    req.angle?.trim() ? `Angle to emphasise: ${req.angle.trim()}` : '',
    '',
    'Source material:',
    req.material.trim() || '(none)',
    '',
    isPatientFacing(req.audience)
      ? 'End the post with exactly: "This is general information, not medical advice. Talk to a qualified health professional about your situation."'
      : '',
    'Write a complete, ready-to-post draft for this channel and audience. Respond as JSON: { "body": string }.',
  ]
    .filter(Boolean)
    .join('\n');
}
