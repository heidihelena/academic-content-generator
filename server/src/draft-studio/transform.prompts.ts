import { MEDICAL_DISCLAIMER } from '../safety/patient-safe';
import { SAFETY_RULES } from './composer.prompts';
import {
  LANGUAGE_NAMES,
  TransformAction,
  TransformRequest,
  VoiceProfile,
} from './transform.types';

/** Prompts + JSON schema for the LLM-backed draft transform. */

export const TRANSFORM_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { body: { type: 'string' }, note: { type: 'string' } },
  required: ['body'],
};

/** What each action asks the editor to do. `translate` and `apply-voice` get
 *  their specifics (language, voice profile) appended in the user prompt. */
const ACTION_INSTRUCTIONS: Record<TransformAction, string> = {
  clearer: 'Rewrite for clarity: shorter sentences, plainer words, same ideas in the same order.',
  shorten: 'Shorten the text. Cut filler and repetition, never claims or hedges.',
  'more-human': 'Make the register warmer and more conversational.',
  'more-professional': 'Make the register more formal and professional.',
  'for-linkedin':
    'Reshape as a LinkedIn post: a strong plain-language opening line, short paragraphs, no hashtag spam.',
  'for-clinicians':
    'Reframe for a clinician audience: precise terminology, and make the evidence level explicit.',
  'for-patients':
    `Reframe for patients: plain, jargon-free language at roughly an 8th-grade reading level. This is general information, not medical advice — give no individual advice, diagnosis or treatment direction. End the text with exactly: "${MEDICAL_DISCLAIMER}"`,
  translate:
    'Translate the text faithfully into the target language. Keep every hedge and every expression of uncertainty; do not strengthen, weaken or localize any claim.',
  'apply-voice': 'Rewrite the text in the author voice profile given below.',
};

export function transformSystemPrompt(): string {
  return [
    'You are a careful science-communication editor. You transform an existing draft without changing what it says.',
    'Rules:',
    '- Preserve the meaning and the claims of the text exactly — edit register and shape only.',
    '- Never add new claims, numbers or recommendations, and never drop or strengthen existing ones.',
    '- Keep hedges and uncertainty ("may", "was associated with") intact.',
    SAFETY_RULES,
  ].join('\n');
}

function describeVoice(voice: VoiceProfile): string[] {
  return [
    'Voice profile:',
    `- Name: ${voice.name}`,
    `- Tone: ${voice.tone}`,
    `- Formality: ${voice.formality}`,
    `- Preferred length: ${voice.preferredLength}`,
    voice.wordsToAvoid.length ? `- Words to avoid: ${voice.wordsToAvoid.join(', ')}` : '',
    ...(voice.styleExamples.length
      ? ['- Style examples:', ...voice.styleExamples.map((s) => `  · ${s}`)]
      : []),
  ].filter(Boolean);
}

export function buildTransformUserPrompt(req: TransformRequest): string {
  return [
    `Task: ${ACTION_INSTRUCTIONS[req.action]}`,
    req.action === 'translate' && req.language
      ? `Target language: ${LANGUAGE_NAMES[req.language]}`
      : '',
    req.audience?.trim() ? `Audience: ${req.audience.trim()}` : '',
    ...(req.action === 'apply-voice' && req.voice ? describeVoice(req.voice) : []),
    '',
    'Text to transform:',
    req.body.trim(),
    '',
    'Respond as JSON: { "body": string, "note": string (optional, one short sentence on what you changed) }.',
  ]
    .filter(Boolean)
    .join('\n');
}
