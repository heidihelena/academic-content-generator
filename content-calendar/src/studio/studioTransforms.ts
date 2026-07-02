import { ApiClient } from '../lib/api';
import { getVoiceProfile } from '../voices/voicesStore';
import { MEDICAL_DISCLAIMER } from './studioReview';
import type { StudioAudience } from './studioTypes';

/**
 * Draft rewrite actions — "make it clearer / shorter / for patients / …" and
 * translation. Same swap-by-config shape as the rest of the studio:
 *
 *  - `LocalTransformEngine` — deterministic, dependency-free text edits. Honest
 *    about its limits: translation needs a language model, so locally it leaves
 *    the draft unchanged and says so instead of pretending.
 *  - `ApiTransformEngine` — `POST /draft-studio/transform` (LLM-backed when the
 *    server has a provider configured), falling back to local on any error.
 *
 * Every transform preserves the draft's claims — these are edits of register
 * and shape, not of meaning. The safety review re-runs afterwards regardless.
 */

export const REWRITE_ACTIONS = [
  'clearer',
  'shorten',
  'more-human',
  'more-professional',
  'for-linkedin',
  'for-clinicians',
  'for-patients',
] as const;
export type RewriteAction = (typeof REWRITE_ACTIONS)[number];

export const REWRITE_ACTION_LABELS: Record<RewriteAction, string> = {
  clearer: 'Clearer',
  shorten: 'Shorten',
  'more-human': 'More human',
  'more-professional': 'More professional',
  'for-linkedin': 'For LinkedIn',
  'for-clinicians': 'For clinicians',
  'for-patients': 'For patients',
};

export const STUDIO_LANGUAGES = ['en', 'fi', 'sv', 'da', 'no', 'de'] as const;
export type StudioLanguage = (typeof STUDIO_LANGUAGES)[number];
export const STUDIO_LANGUAGE_LABELS: Record<StudioLanguage, string> = {
  en: 'English',
  fi: 'Finnish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  de: 'German',
};

export interface TransformRequest {
  body: string;
  action: RewriteAction | 'translate' | 'apply-voice';
  /** Target language for `translate`. */
  language?: StudioLanguage;
  /** Voice profile id for `apply-voice`. */
  voiceProfileId?: string;
  audience: StudioAudience;
}

export interface TransformResult {
  body: string;
  /** A caveat for the author, e.g. "translation needs an AI provider". */
  note?: string;
}

export interface TransformEngine {
  transform(req: TransformRequest): Promise<TransformResult>;
}

// --- Local deterministic transforms ------------------------------------------

const JARGON: ReadonlyArray<[RegExp, string]> = [
  [/\butilize(s|d)?\b/gi, 'use$1'],
  [/\bmethodolog(?:y|ies)\b/gi, 'methods'],
  [/\bdemonstrates?\b/gi, 'shows'],
  [/\bfacilitates?\b/gi, 'helps'],
  [/\bapproximately\b/gi, 'about'],
  [/\bsubsequently\b/gi, 'then'],
  [/\bin order to\b/gi, 'to'],
  [/\befficacy\b/gi, 'how well it works'],
  [/\badverse events?\b/gi, 'side effects'],
  [/\bcohort\b/gi, 'group'],
];

const FILLERS = /\b(?:very|really|quite|actually|basically|essentially|truly)\s+/gi;

const CASUAL: ReadonlyArray<[RegExp, string]> = [
  [/\bhowever,?\b/gi, 'but'],
  [/\btherefore,?\b/gi, 'so'],
  [/\bmoreover,?\b/gi, 'also'],
  [/\bdo not\b/gi, "don't"],
  [/\bit is\b/gi, "it's"],
  [/\bwe are\b/gi, "we're"],
  [/\bcannot\b/gi, "can't"],
];

const FORMAL: ReadonlyArray<[RegExp, string]> = [
  [/\bdon't\b/gi, 'do not'],
  [/\bit's\b/gi, 'it is'],
  [/\bwe're\b/gi, 'we are'],
  [/\bcan't\b/gi, 'cannot'],
  [/\bisn't\b/gi, 'is not'],
  [/\bkinda\b/gi, 'somewhat'],
  [/\ba lot of\b/gi, 'many'],
];

function applyPairs(body: string, pairs: ReadonlyArray<[RegExp, string]>): string {
  return pairs.reduce(
    (text, [pattern, replacement]) =>
      text.replace(pattern, (match, ...rest) => {
        // Resolve capture-group references, then preserve the original casing.
        const groups = rest.slice(0, -2) as string[];
        const resolved = replacement.replace(/\$(\d)/g, (_, i) => groups[Number(i) - 1] ?? '');
        return /^[A-Z]/.test(match) ? resolved.charAt(0).toUpperCase() + resolved.slice(1) : resolved;
      }),
    body,
  );
}

function splitSentences(body: string): string[] {
  return body.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function shorten(body: string): string {
  const paragraphs = body.split(/\n{2,}/);
  const trimmed = paragraphs.map((p) => {
    const sentences = splitSentences(p);
    if (sentences.length <= 2) return p;
    return sentences.slice(0, Math.max(2, Math.ceil(sentences.length * 0.6))).join(' ');
  });
  return trimmed.join('\n\n').replace(FILLERS, '');
}

function forPatients(body: string): string {
  const plain = applyPairs(body, JARGON);
  return plain.includes(MEDICAL_DISCLAIMER) ? plain : `${plain}\n\n${MEDICAL_DISCLAIMER}`;
}

function forLinkedin(body: string): string {
  // LinkedIn reads best as short, separated paragraphs with one closing prompt.
  const sentences = splitSentences(body.replace(/\n{2,}/g, '\n').replace(/\n/g, ' '));
  const spaced = sentences.join('\n\n');
  return /\?\s*$/.test(spaced) ? spaced : `${spaced}\n\nWhat has your experience been?`;
}

function forClinicians(body: string): string {
  const formal = applyPairs(body, FORMAL);
  const note = 'For clinical colleagues: see the linked source for effect sizes, population and limitations before applying this.';
  return formal.includes(note) ? formal : `${formal}\n\n${note}`;
}

export class LocalTransformEngine implements TransformEngine {
  async transform(req: TransformRequest): Promise<TransformResult> {
    const body = req.body;
    switch (req.action) {
      case 'clearer':
        return { body: applyPairs(body, JARGON).replace(FILLERS, '') };
      case 'shorten':
        return { body: shorten(body) };
      case 'more-human':
        return { body: applyPairs(body, CASUAL) };
      case 'more-professional':
        return { body: applyPairs(body, FORMAL).replace(FILLERS, '') };
      case 'for-linkedin':
        return { body: forLinkedin(body) };
      case 'for-clinicians':
        return { body: forClinicians(body) };
      case 'for-patients':
        return { body: forPatients(body) };
      case 'apply-voice': {
        const voice = req.voiceProfileId ? getVoiceProfile(req.voiceProfileId) : undefined;
        if (!voice) return { body, note: 'Pick a voice profile first.' };
        let next = voice.formality === 'informal' ? applyPairs(body, CASUAL) : applyPairs(body, FORMAL);
        if (voice.preferredLength === 'short') next = shorten(next);
        // Scrub the voice's avoided words locally; the LLM path rewrites properly.
        for (const word of voice.wordsToAvoid) {
          if (!word.trim()) continue;
          next = next.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        }
        return { body: next.replace(/ {2,}/g, ' ') };
      }
      case 'translate':
        return {
          body,
          note:
            'Translation needs a language model. Enable Claude or a local model (Ollama) in Settings — the draft was left unchanged rather than mistranslated.',
        };
    }
  }
}

export class ApiTransformEngine implements TransformEngine {
  private readonly local = new LocalTransformEngine();

  constructor(private readonly api: ApiClient) {}

  async transform(req: TransformRequest): Promise<TransformResult> {
    try {
      const voice = req.voiceProfileId ? getVoiceProfile(req.voiceProfileId) : undefined;
      const out = await this.api.post<TransformResult>('/draft-studio/transform', {
        body: req.body,
        action: req.action,
        language: req.language,
        audience: req.audience,
        voice: voice
          ? {
              name: voice.name,
              tone: voice.tone,
              formality: voice.formality,
              preferredLength: voice.preferredLength,
              wordsToAvoid: voice.wordsToAvoid,
              styleExamples: voice.styleExamples,
            }
          : undefined,
      });
      if (out && typeof out.body === 'string' && out.body.trim()) return out;
    } catch {
      // fall through to the local transform
    }
    return this.local.transform(req);
  }
}

function createDefault(): TransformEngine {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiTransformEngine(new ApiClient(baseUrl)) : new LocalTransformEngine();
}

let active: TransformEngine = createDefault();

/** Override the active engine (used by tests). */
export function setTransformEngine(engine: TransformEngine): void {
  active = engine;
}

export function transformDraft(req: TransformRequest): Promise<TransformResult> {
  return active.transform(req);
}
