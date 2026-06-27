import { ConfigService } from '@nestjs/config';
import { ConnectionsService } from './connections.service';

function service(values: Record<string, unknown>): ConnectionsService {
  const config = { get: (k: string) => values[k] } as unknown as ConfigService;
  return new ConnectionsService(config);
}

describe('ConnectionsService', () => {
  it('reports mock providers and unconfigured social by default', () => {
    const r = service({}).report();
    expect(r.providers.llm).toEqual({ active: 'mock', live: false });
    expect(r.providers.voice).toEqual({ active: 'mock', live: false });
    expect(r.providers.video).toEqual({ active: 'mock', live: false });
    expect(r.social.find((s) => s.platform === 'bluesky')).toEqual({
      platform: 'bluesky',
      method: 'app-password',
      configured: false,
    });
    expect(r.inputs.persistenceDriver).toBe('memory');
  });

  it('marks a provider live only when its key is present', () => {
    const r = service({
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

  it('treats ollama as live without an API key', () => {
    const r = service({ 'ai.generator': 'llm', 'ai.provider': 'ollama' }).report();
    expect(r.providers.llm).toEqual({ active: 'ollama', live: true });
  });

  it('marks social configured when its credentials are present', () => {
    const r = service({
      'integrations.bluesky.identifier': 'me.bsky.social',
      'integrations.bluesky.appPassword': 'app-pw',
      'integrations.linkedin.clientId': 'cid',
    }).report();
    expect(r.social.find((s) => s.platform === 'bluesky')?.configured).toBe(true);
    expect(r.social.find((s) => s.platform === 'linkedin')?.configured).toBe(true);
    expect(r.social.find((s) => s.platform === 'mastodon')?.configured).toBe(false);
  });

  it('never leaks secret values — only modes and booleans', () => {
    const r = service({ 'ai.anthropicApiKey': 'sk-SECRET', 'media.voice.elevenLabsApiKey': 'el-SECRET' });
    expect(JSON.stringify(r.report())).not.toMatch(/SECRET/);
  });
});
