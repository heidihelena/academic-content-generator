import Anthropic from '@anthropic-ai/sdk';
import { ComposeRequest, DraftComposer } from './composer.types';
import { LocalDraftComposer } from './local.composer';
import {
  DRAFT_JSON_SCHEMA,
  HOOK_JSON_SCHEMA,
  buildDraftUserPrompt,
  buildHookUserPrompt,
  composerSystemPrompt,
} from './composer.prompts';

/**
 * Claude-backed composer (Anthropic SDK), enabled when IDEA_GENERATOR=llm +
 * ANTHROPIC_API_KEY. Any error — or an empty completion — falls back to the
 * deterministic local composer, so the endpoint never fails.
 */
export class LlmDraftComposer implements DraftComposer {
  readonly name: string;
  private readonly client: Anthropic;
  private readonly fallback = new LocalDraftComposer();

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
    this.name = `claude:${model}`;
  }

  async composeHook(req: ComposeRequest): Promise<string> {
    try {
      const { hook } = await this.complete<{ hook: string }>(
        composerSystemPrompt(req.audience),
        buildHookUserPrompt(req),
        HOOK_JSON_SCHEMA,
      );
      if (hook?.trim()) return hook.trim();
    } catch {
      // fall through to the local composer
    }
    return this.fallback.composeHook(req);
  }

  async composeDraft(req: ComposeRequest): Promise<string> {
    try {
      const { body } = await this.complete<{ body: string }>(
        composerSystemPrompt(req.audience),
        buildDraftUserPrompt(req),
        DRAFT_JSON_SCHEMA,
      );
      if (body?.trim()) return body.trim();
    } catch {
      // fall through to the local composer
    }
    return this.fallback.composeDraft(req);
  }

  private async complete<T>(system: string, user: string, schema: unknown): Promise<T> {
    const params = {
      model: this.model,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema } },
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
