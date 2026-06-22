import { BadRequestException } from '@nestjs/common';
import { AccountsService, type PlatformCredentials } from './accounts.service';
import { MemoryAccountsRepository, MemoryTokenStore } from '../persistence/memory/memory.repositories';
import type { IntegrationRegistry } from '../integrations/integration.registry';
import type { Platform } from '../domain/types';
import type { PlatformIntegration } from '../integrations/integration.types';

const registry = {} as unknown as IntegrationRegistry;

/** Lets tests inject a fake integration instead of a real network client. */
class TestAccountsService extends AccountsService {
  constructor(
    accounts: MemoryAccountsRepository,
    tokens: MemoryTokenStore,
    private readonly fake: (platform: Platform, creds: PlatformCredentials) => PlatformIntegration,
  ) {
    super(accounts, tokens, registry);
  }
  protected makeIntegration(platform: Platform, creds: PlatformCredentials): PlatformIntegration {
    return this.fake(platform, creds);
  }
}

function okIntegration(platform: Platform): PlatformIntegration {
  return {
    platform,
    authorizeUrl: () => '',
    disconnect: async () => {},
    publish: async () => ({ remoteId: 'r', permalink: 'p' }),
    connect: async () => ({
      account: { platform, status: 'connected', handle: '@me', displayName: 'Me' },
      token: { platform, accessToken: 'tok', expiresAt: Date.now() + 1e6, scopes: [] },
    }),
  } as unknown as PlatformIntegration;
}

describe('AccountsService.verify', () => {
  it('connects and persists token + account on valid credentials', async () => {
    const accounts = new MemoryAccountsRepository();
    const tokens = new MemoryTokenStore();
    const service = new TestAccountsService(accounts, tokens, (p) => okIntegration(p));

    const result = await service.verify('bluesky', { identifier: 'me', appPassword: 'pw' });
    expect(result.status).toBe('connected');
    expect(await tokens.get('bluesky')).toBeTruthy();
    expect(await accounts.findByPlatform('bluesky')).toMatchObject({ status: 'connected' });
  });

  it('throws BadRequest when the credentials are rejected by the platform', async () => {
    const service = new TestAccountsService(
      new MemoryAccountsRepository(),
      new MemoryTokenStore(),
      (p) =>
        ({
          ...okIntegration(p),
          connect: async () => {
            throw new Error('bluesky API 401: invalid app password');
          },
        }) as unknown as PlatformIntegration,
    );
    await expect(
      service.verify('bluesky', { identifier: 'me', appPassword: 'bad' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AccountsService.makeIntegration validation', () => {
  const service = new AccountsService(new MemoryAccountsRepository(), new MemoryTokenStore(), registry);

  it('rejects OAuth platforms (no credential path)', async () => {
    await expect(service.verify('instagram', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires both Bluesky fields', async () => {
    await expect(service.verify('bluesky', { identifier: 'me' })).rejects.toThrow(/app password/i);
  });

  it('requires both Mastodon fields', async () => {
    await expect(service.verify('mastodon', { instance: 'https://x' })).rejects.toThrow(/access token/i);
  });
});
