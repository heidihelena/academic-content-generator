import { BadRequestException } from '@nestjs/common';
import { LlmClient } from '../ai/llm-client';
import { MEDICAL_DISCLAIMER } from '../safety/patient-safe';
import {
  TRANSFORM_JSON_SCHEMA,
  buildTransformUserPrompt,
  transformSystemPrompt,
} from './transform.prompts';
import {
  LANGUAGE_NAMES,
  TRANSFORM_ACTIONS,
  TRANSFORM_LANGUAGES,
  TransformLanguage,
  TransformRequest,
  TransformResult,
} from './transform.types';

/**
 * Draft transform (rewrite / translate) for the frontend Draft Studio.
 *
 * LLM-backed when a client is configured (one structured completion,
 * register-and-shape edits only); deterministic otherwise. Any LLM error — or
 * an empty completion — falls back to the local transform, so after the input
 * is validated the endpoint never fails. Constructed by the Draft Studio
 * module's config factory (the same swap-by-config pattern as the composer).
 */
export class TransformService {
  constructor(private readonly client: LlmClient | null) {}

  async transform(req: TransformRequest): Promise<TransformResult> {
    this.validate(req);
    if (this.client) {
      try {
        const out = await this.client.completeJson<TransformResult>({
          system: transformSystemPrompt(),
          user: buildTransformUserPrompt(req),
          schema: TRANSFORM_JSON_SCHEMA,
          maxTokens: 2048,
        });
        if (out.body?.trim()) {
          return {
            body: this.ensureDisclaimer(out.body.trim(), req),
            note: out.note?.trim() || undefined,
          };
        }
      } catch {
        // fall through to the local transform
      }
    }
    return this.localTransform(req);
  }

  private validate(req: TransformRequest): void {
    if (typeof req?.body !== 'string' || !req.body.trim()) {
      throw new BadRequestException('body must be a non-empty string');
    }
    if (!TRANSFORM_ACTIONS.includes(req.action)) {
      throw new BadRequestException(`action must be one of: ${TRANSFORM_ACTIONS.join(', ')}`);
    }
    if (
      req.action === 'translate' &&
      !TRANSFORM_LANGUAGES.includes(req.language as TransformLanguage)
    ) {
      throw new BadRequestException(`language must be one of: ${TRANSFORM_LANGUAGES.join(', ')}`);
    }
    if (req.action === 'apply-voice' && !req.voice) {
      throw new BadRequestException('voice profile is required for apply-voice');
    }
  }

  /** Patient-facing framing is enforced here so it holds whichever path ran. */
  private ensureDisclaimer(body: string, req: TransformRequest): string {
    if (req.action === 'for-patients' && !body.includes(MEDICAL_DISCLAIMER)) {
      return `${body}\n\n${MEDICAL_DISCLAIMER}`;
    }
    return body;
  }

  /**
   * Deterministic fallback (no LLM configured, or the call failed): apply the
   * safe subset of each action and say so in `note`. Never throws.
   */
  private localTransform(req: TransformRequest): TransformResult {
    const body = req.body.trim();
    switch (req.action) {
      case 'translate':
        return {
          body,
          note: `Translation to ${LANGUAGE_NAMES[req.language as TransformLanguage]} needs a language model (set IDEA_GENERATOR=llm) — returning the original text.`,
        };
      case 'for-patients':
        return {
          body: this.ensureDisclaimer(body, req),
          note: 'Added the standard not-medical-advice disclaimer; a plain-language rewrite needs a language model.',
        };
      case 'shorten':
        return {
          body: body.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n'),
          note: 'Trimmed whitespace only — a real shortening needs a language model.',
        };
      default:
        return {
          body,
          note: 'This rewrite needs a language model (set IDEA_GENERATOR=llm) — returning the text unchanged.',
        };
    }
  }
}
