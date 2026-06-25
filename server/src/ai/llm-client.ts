import Anthropic from '@anthropic-ai/sdk';

/**
 * Provider-agnostic LLM client. The composers depend only on this interface, so
 * the backend swaps by configuration — Anthropic (Claude) or a local Ollama
 * model — with no change to the composing code. A null client means "no LLM
 * configured", and callers fall back to their deterministic local impl.
 *
 * Claude Code MCP is a third option: point an MCP-aware client at this app's
 * tools, or run the composers through a Claude Code agent. That integration
 * lives outside this client (it drives the HTTP API), so it needs no provider
 * entry here — see docs/PRODUCT_DIRECTION.md.
 */
export interface LlmCompletion {
  system: string;
  user: string;
  /** JSON schema the response must satisfy. */
  schema: unknown;
  maxTokens: number;
}

export interface LlmClient {
  readonly name: string;
  completeJson<T>(req: LlmCompletion): Promise<T>;
}

/** Claude via the Anthropic SDK (structured JSON output). */
export class AnthropicLlmClient implements LlmClient {
  readonly name: string;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
    this.name = `anthropic:${model}`;
  }

  async completeJson<T>({ system, user, schema, maxTokens }: LlmCompletion): Promise<T> {
    const params = {
      model: this.model,
      max_tokens: maxTokens,
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

/** A local LLM via Ollama's /api/chat (no API key, runs offline). */
export class OllamaLlmClient implements LlmClient {
  readonly name: string;

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {
    this.name = `ollama:${model}`;
  }

  async completeJson<T>({ system, user, schema, maxTokens }: LlmCompletion): Promise<T> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        // Ollama accepts a JSON schema object (structured output) or "json".
        format: schema ?? 'json',
        options: { num_predict: maxTokens },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama request failed (${res.status})`);
    const data = (await res.json()) as { message?: { content?: string } };
    return JSON.parse(data.message?.content ?? '{}') as T;
  }
}

export interface LlmConfig {
  provider: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

/**
 * Build the configured LLM client, or `null` when none is usable (e.g. provider
 * is `anthropic` but no key is set) — callers then fall back to local.
 */
export function createLlmClient(cfg: LlmConfig): LlmClient | null {
  if (cfg.provider === 'ollama') return new OllamaLlmClient(cfg.ollamaBaseUrl, cfg.ollamaModel);
  if (cfg.provider === 'anthropic' && cfg.anthropicApiKey) {
    return new AnthropicLlmClient(cfg.anthropicApiKey, cfg.anthropicModel);
  }
  return null;
}
