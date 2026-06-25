import { LlmClient } from '../ai/llm-client';
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
 * LLM-backed composer (Claude or a local Ollama model, via {@link LlmClient}),
 * enabled when IDEA_GENERATOR=llm. Any error — or an empty completion — falls
 * back to the deterministic local composer, so the endpoint never fails.
 */
export class LlmDraftComposer implements DraftComposer {
  readonly name: string;
  private readonly fallback = new LocalDraftComposer();

  constructor(private readonly client: LlmClient) {
    this.name = client.name;
  }

  async composeHook(req: ComposeRequest): Promise<string> {
    try {
      const { hook } = await this.client.completeJson<{ hook: string }>({
        system: composerSystemPrompt(req.audience),
        user: buildHookUserPrompt(req),
        schema: HOOK_JSON_SCHEMA,
        maxTokens: 1024,
      });
      if (hook?.trim()) return hook.trim();
    } catch {
      // fall through to the local composer
    }
    return this.fallback.composeHook(req);
  }

  async composeDraft(req: ComposeRequest): Promise<string> {
    try {
      const { body } = await this.client.completeJson<{ body: string }>({
        system: composerSystemPrompt(req.audience),
        user: buildDraftUserPrompt(req),
        schema: DRAFT_JSON_SCHEMA,
        maxTokens: 2048,
      });
      if (body?.trim()) return body.trim();
    } catch {
      // fall through to the local composer
    }
    return this.fallback.composeDraft(req);
  }
}
