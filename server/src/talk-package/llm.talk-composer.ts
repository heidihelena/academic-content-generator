import { LlmClient } from '../ai/llm-client';
import { composerSystemPrompt } from '../draft-studio/composer.prompts';
import { ContentPlan, ContentPoint } from '../content-plan/content-plan.types';
import { LocalTalkComposer } from './local.talk-composer';
import {
  ShortComposeOptions,
  TalkComposeOptions,
  TalkComposer,
} from './talk-composer.types';
import { BODY_JSON_SCHEMA, buildShortUserPrompt, buildTalkUserPrompt } from './talk.prompts';

/**
 * LLM-backed talk composer (Claude or a local Ollama model, via {@link LlmClient}),
 * enabled when IDEA_GENERATOR=llm. Turns a {@link ContentPlan} into spoken prose.
 * Any error — or an empty completion — falls back to the local scaffold, so the
 * endpoint never fails. The composed text is still run through the shared safety
 * review by the service, so an overclaim can't slip out unreviewed.
 */
export class LlmTalkComposer implements TalkComposer {
  readonly name: string;
  private readonly fallback = new LocalTalkComposer();

  constructor(private readonly client: LlmClient) {
    this.name = client.name;
  }

  async composeTalk(plan: ContentPlan, opts: TalkComposeOptions): Promise<string> {
    try {
      const { body } = await this.client.completeJson<{ body: string }>({
        system: composerSystemPrompt(opts.audience),
        user: buildTalkUserPrompt(plan, opts),
        schema: BODY_JSON_SCHEMA,
        maxTokens: Math.min(8192, Math.round(opts.durationMin * 200)),
      });
      if (body?.trim()) return body.trim();
    } catch {
      // fall through to the local scaffold
    }
    return this.fallback.composeTalk(plan, opts);
  }

  async composeShort(
    plan: ContentPlan,
    point: ContentPoint,
    index: number,
    opts: ShortComposeOptions,
  ): Promise<string> {
    try {
      const { body } = await this.client.completeJson<{ body: string }>({
        system: composerSystemPrompt(opts.audience),
        user: buildShortUserPrompt(plan, point, index, opts.audience, opts.url),
        schema: BODY_JSON_SCHEMA,
        maxTokens: 1024,
      });
      if (body?.trim()) return body.trim();
    } catch {
      // fall through to the local scaffold
    }
    return this.fallback.composeShort(plan, point, index, opts);
  }
}
