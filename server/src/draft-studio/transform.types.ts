/**
 * Draft transform (rewrite / translate) — the seam the frontend Draft Studio
 * uses to reshape an existing draft. Register-and-shape edits only: a transform
 * must preserve the draft's meaning and claims exactly.
 */

/** The rewrites the transform endpoint supports. */
export const TRANSFORM_ACTIONS = [
  'clearer',
  'shorten',
  'more-human',
  'more-professional',
  'for-linkedin',
  'for-clinicians',
  'for-patients',
  'translate',
  'apply-voice',
] as const;
export type TransformAction = (typeof TRANSFORM_ACTIONS)[number];

/** Target languages for `translate`. */
export const TRANSFORM_LANGUAGES = ['en', 'fi', 'sv', 'da', 'no', 'de'] as const;
export type TransformLanguage = (typeof TRANSFORM_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<TransformLanguage, string> = {
  en: 'English',
  fi: 'Finnish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  de: 'German',
};

/** An author voice profile, applied by the `apply-voice` action. */
export interface VoiceProfile {
  name: string;
  tone: string;
  formality: string;
  preferredLength: string;
  wordsToAvoid: string[];
  styleExamples: string[];
}

export interface TransformRequest {
  /** The draft text to transform. */
  body: string;
  action: TransformAction;
  /** Target language — required for `translate`. */
  language?: TransformLanguage;
  /** Optional audience hint (free-form, informs register only). */
  audience?: string;
  /** Voice profile — required for `apply-voice`. */
  voice?: VoiceProfile;
}

export interface TransformResult {
  body: string;
  /** Optional short note about what was (or could not be) done. */
  note?: string;
}
