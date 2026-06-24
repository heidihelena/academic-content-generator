import Anthropic from '@anthropic-ai/sdk';
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
 * Claude-backed talk composer (Anthropic SDK), enabled when IDEA_GENERATOR=llm +
 * ANTHROPIC_API_KEY. Turns a {@link ContentPlan} into spoken prose. Any error —
 * or an empty completion — falls back to the local scaffold, so the endpoint
 * never fails. The composed text is still run through the shared safety review
 * by the service, so an overclaim can't slip out unreviewed.
 */
export class LlmTalkComposer implements TalkComposer {
  readonly name: string;
  private readonly client: Anthropic;
  private readonly fallback = new LocalTalkComposer();

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
    this.name = `claude:${model}`;
  }

  async composeTalk(plan: ContentPlan, opts: TalkComposeOptions): Promise<string> {
    try {
      const { body } = await this.complete<{ body: string }>(
        composerSystemPrompt(opts.audience),
        buildTalkUserPrompt(plan, opts),
        Math.min(8192, Math.round(opts.durationMin * 200)),
      );
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
      const { body } = await this.complete<{ body: string }>(
        composerSystemPrompt(opts.audience),
        buildShortUserPrompt(plan, point, index, opts.audience, opts.url),
        1024,
      );
      if (body?.trim()) return body.trim();
    } catch {
      // fall through to the local scaffold
    }
    return this.fallback.composeShort(plan, point, index, opts);
  }

  private async complete<T>(system: string, user: string, maxTokens: number): Promise<T> {
    const params = {
      model: this.model,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema: BODY_JSON_SCHEMA } },
      system,
      messages: [{ role: 'user', content: user }],
    };
    const message = (await this.client.messages.create(params as never)) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = message.content.find((b) => b.type === 'text')?.text ?? '{}';
    return JSON.parse(text) as T;
  }
}
