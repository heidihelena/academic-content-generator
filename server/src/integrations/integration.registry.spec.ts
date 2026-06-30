import { ConfigService } from '@nestjs/config';
import { IntegrationRegistry } from './integration.registry';
import { BlueskyIntegration } from './bluesky.integration';
import { MastodonIntegration } from './mastodon.integration';
import { XIntegration } from './x.integration';
import { MockIntegration } from './mock.integration';
import { MemoryTokenStore } from '../persistence/memory/memory.repositories';
import type { TokenStore } from '../persistence/repository.interfaces';

const config = new ConfigService({}); // no integration env → all platforms mock

function registry(tokens: TokenStore): IntegrationRegistry {
  return new IntegrationRegistry(config, tokens);
}

describe('IntegrationRegistry.forPublish', () => {
  it('keeps the mock for Bluesky when no account is connected', async () => {
    const reg = registry(new MemoryTokenStore());
    expect(await reg.forPublish('bluesky')).toBeInstanceOf(MockIntegration);
  });

  it('uses the real Bluesky client once an account is connected in-app', async () => {
    const tokens = new MemoryTokenStore();
    await tokens.set({
      platform: 'bluesky',
      accessToken: 'jwt',
      refreshToken: 'refresh',
      accountId: 'did:plc:abc',
      expiresAt: Date.now() + 1e6,
      scopes: [],
    });
    const reg = registry(tokens);

    const integration = await reg.forPublish('bluesky');
    expect(integration).toBeInstanceOf(BlueskyIntegration);
    // get() still returns the configured (mock) client — only publishing upgrades.
    expect(reg.get('bluesky')).toBeInstanceOf(MockIntegration);
  });

  it('uses the mock for X with no developer app, and the real client when configured', () => {
    expect(registry(new MemoryTokenStore()).get('x')).toBeInstanceOf(MockIntegration);

    const configured = new IntegrationRegistry(
      new ConfigService({ integrations: { x: { clientId: 'id', clientSecret: 'sec' } } }),
      new MemoryTokenStore(),
    );
    expect(configured.get('x')).toBeInstanceOf(XIntegration);
  });

  it('uses the real Mastodon client once an in-app token includes its instance URL', async () => {
    const tokens = new MemoryTokenStore();
    await tokens.set({
      platform: 'mastodon',
      accessToken: 't',
      serviceUrl: 'https://fediscience.org',
      expiresAt: Date.now() + 1e6,
      scopes: [],
    });
    const reg = registry(tokens);

    expect(await reg.forPublish('mastodon')).toBeInstanceOf(MastodonIntegration);
  });

  it('falls back to the configured client when a token lacks required host metadata', async () => {
    const tokens = new MemoryTokenStore();
    await tokens.set({ platform: 'mastodon', accessToken: 't', expiresAt: Date.now() + 1e6, scopes: [] });
    const reg = registry(tokens);
    // Mastodon also needs its instance URL to choose the right API host.
    expect(await reg.forPublish('mastodon')).toBeInstanceOf(MockIntegration);
  });
});
