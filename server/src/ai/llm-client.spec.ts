import { OllamaLlmClient, createLlmClient } from './llm-client';

describe('createLlmClient', () => {
  const base = {
    anthropicModel: 'claude-opus-4-8',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1',
  };

  it('returns an Anthropic client when provider=anthropic and a key is set', () => {
    const client = createLlmClient({ ...base, provider: 'anthropic', anthropicApiKey: 'sk-test' });
    expect(client?.name).toBe('anthropic:claude-opus-4-8');
  });

  it('returns null when provider=anthropic but no key is set', () => {
    expect(createLlmClient({ ...base, provider: 'anthropic' })).toBeNull();
  });

  it('returns an Ollama client when provider=ollama (no key needed)', () => {
    const client = createLlmClient({ ...base, provider: 'ollama' });
    expect(client?.name).toBe('ollama:llama3.1');
  });

  it('returns null for an unknown provider', () => {
    expect(createLlmClient({ ...base, provider: 'mystery' })).toBeNull();
  });
});

describe('OllamaLlmClient', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });

  it('POSTs to /api/chat and parses the JSON message content', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    global.fetch = (async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return {
        ok: true,
        json: async () => ({ message: { content: JSON.stringify({ body: 'hi' }) } }),
      };
    }) as unknown as typeof fetch;

    const client = new OllamaLlmClient('http://localhost:11434/', 'llama3.1');
    const out = await client.completeJson<{ body: string }>({
      system: 'sys',
      user: 'usr',
      schema: { type: 'object' },
      maxTokens: 256,
    });

    expect(out.body).toBe('hi');
    expect(calls[0].url).toBe('http://localhost:11434/api/chat'); // trailing slash trimmed
    expect(calls[0].body).toMatchObject({
      model: 'llama3.1',
      stream: false,
      format: { type: 'object' },
      options: { num_predict: 256 },
    });
  });

  it('throws when the request is not ok', async () => {
    global.fetch = (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    const client = new OllamaLlmClient('http://localhost:11434', 'llama3.1');
    await expect(
      client.completeJson({ system: 's', user: 'u', schema: undefined, maxTokens: 8 }),
    ).rejects.toThrow('Ollama request failed (503)');
  });
});
