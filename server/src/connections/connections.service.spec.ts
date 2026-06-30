import { ConfigService } from '@nestjs/config';
import { ConnectionsService } from './connections.service';
import { MemoryAccountsRepository, MemoryTokenStore } from '../persistence/memory/memory.repositories';
import type { Platform } from '../domain/types';

function service(
  values: Record<string, unknown>,
  setup?: {
    connected?: Platform;
  },
): ConnectionsService {
  const config = { get: (k: string) => values[k] } as unknown as ConfigService;
  const accounts = new MemoryAccountsRepository();
  const tokens = new MemoryTokenStore();
  if (setup?.connected) {
    const platform = setup.connected;
    void accounts.upsert({ platform, status: 'connected', handle: '@me' });
    void tokens.set({ platform, accessToken: 'tok', expiresAt: Date.now() + 1e6, scopes: [] });
  }
  return new ConnectionsService(config, accounts, tokens);
}

describe('ConnectionsService', () => {
  it('reports mock providers and unconfigured social by default', async () => {
    const r = await service({}).report();
    expect(r.providers.llm).toEqual({ active: 'mock', live: false });
    expect(r.providers.voice).toEqual({ active: 'mock', live: false });
    expect(r.providers.video).toEqual({ active: 'mock', live: false });
    expect(r.social.find((s) => s.platform === 'bluesky')).toEqual({
      platform: 'bluesky',
      method: 'app-password',
      configured: false,
      connected: false,
    });
    expect(r.inputs.persistenceDriver).toBe('memory');
  });

  it('marks a provider live only when its key is present', async () => {
    const r = await service({
      'ai.generator': 'llm',
      'ai.provider': 'anthropic',
      'ai.anthropicApiKey': 'sk-x',
      'media.voice.provider': 'elevenlabs',
      'media.voice.elevenLabsApiKey': 'el-x',
      'media.video.provider': 'heygen', // no key → not live
    }).report();
    expect(r.providers.llm.live).toBe(true);
    expect(r.providers.voice.live).toBe(true);
    expect(r.providers.video).toEqual({ active: 'heygen', live: false });
  });

  it('treats ollama as live without an API key', async () => {
    const r = await service({ 'ai.generator': 'llm', 'ai.provider': 'ollama' }).report();
    expect(r.providers.llm).toEqual({ active: 'ollama', live: true });
  });

  it('marks social configured when its credentials are present', async () => {
    const r = await service({
      'integrations.bluesky.identifier': 'me.bsky.social',
      'integrations.bluesky.appPassword': 'app-pw',
      'integrations.linkedin.clientId': 'cid',
    }).report();
    expect(r.social.find((s) => s.platform === 'bluesky')?.configured).toBe(true);
    expect(r.social.find((s) => s.platform === 'linkedin')?.configured).toBe(true);
    expect(r.social.find((s) => s.platform === 'mastodon')?.configured).toBe(false);
  });

  it('marks social connected when an account and token are present', async () => {
    const r = await service({}, { connected: 'mastodon' }).report();
    expect(r.social.find((s) => s.platform === 'mastodon')).toMatchObject({
      configured: true,
      connected: true,
    });
  });

  it('never leaks secret values — only modes and booleans', async () => {
    const r = await service({
      'ai.anthropicApiKey': 'sk-SECRET',
      'media.voice.elevenLabsApiKey': 'el-SECRET',
    }).report();
    expect(JSON.stringify(r)).not.toMatch(/SECRET/);
  });
});
