import Anthropic from '@anthropic-ai/sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SHORTS_JSON_SCHEMA,
  SHORTS_SYSTEM_PROMPT,
  THREAD_JSON_SCHEMA,
  THREAD_SYSTEM_PROMPT,
  buildShortsUserPrompt,
  buildThreadUserPrompt,
  type ShortsPlanRequest,
  type ThreadDraftRequest,
} from './drafts.prompts';

export interface ThreadDraftResult {
  parts: string[];
  source: string;
}
export interface ShortIdea {
  title: string;
  hook: string;
  caption: string;
  startSeconds?: number;
  endSeconds?: number;
}
export interface ShortsPlanResult {
  shorts: ShortIdea[];
  source: string;
}

/**
 * LLM-backed drafters (Claude via the Anthropic SDK), reusing the same config as
 * the idea generator (IDEA_GENERATOR=llm + ANTHROPIC_API_KEY). When the LLM is
 * not configured these throw 503 so the frontend falls back to its deterministic
 * local drafter — the app always works, and gets better with a key.
 */
@Injectable()
export class DraftsService {
  private readonly model: string;
  private readonly client: Anthropic | null;

  constructor(config: ConfigService) {
    const enabled = config.get<string>('ai.generator') === 'llm';
    const key = config.get<string>('ai.anthropicApiKey');
    this.model = config.get<string>('ai.anthropicModel') ?? 'claude-sonnet-4-6';
    this.client = enabled && key ? new Anthropic({ apiKey: key }) : null;
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async thread(req: ThreadDraftRequest): Promise<ThreadDraftResult> {
    const parsed = await this.complete<{ parts: string[] }>(
      THREAD_SYSTEM_PROMPT,
      buildThreadUserPrompt(req),
      THREAD_JSON_SCHEMA,
    );
    return { parts: (parsed.parts ?? []).filter(Boolean), source: `claude:${this.model}` };
  }

  async shorts(req: ShortsPlanRequest): Promise<ShortsPlanResult> {
    const parsed = await this.complete<{ shorts: ShortIdea[] }>(
      SHORTS_SYSTEM_PROMPT,
      buildShortsUserPrompt(req),
      SHORTS_JSON_SCHEMA,
    );
    return { shorts: (parsed.shorts ?? []).slice(0, req.count), source: `claude:${this.model}` };
  }

  private async complete<T>(system: string, user: string, schema: unknown): Promise<T> {
    if (!this.client) {
      throw new ServiceUnavailableException('LLM not configured');
    }
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
