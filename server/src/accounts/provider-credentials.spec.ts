import { mkdtempSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { ProviderCredentialsService } from './provider-credentials';
import { IntegrationRegistry } from '../integrations/integration.registry';
import { LinkedInIntegration } from '../integrations/linkedin.integration';
import { MockIntegration } from '../integrations/mock.integration';
import type { TokenStore } from '../persistence/repository.interfaces';

function configWith(values: Record<string, string | undefined> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const noTokens = { get: async () => null } as unknown as TokenStore;

function freshPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'provider-creds-')), 'provider-credentials.json');
}

describe('ProviderCredentialsService', () => {
  const realPath = process.env.PROVIDER_CREDENTIALS_PATH;
  afterEach(() => {
    if (realPath) process.env.PROVIDER_CREDENTIALS_PATH = realPath;
    else delete process.env.PROVIDER_CREDENTIALS_PATH;
  });

  it('round-trips credentials and reports configured booleans', () => {
    process.env.PROVIDER_CREDENTIALS_PATH = freshPath();
    const store = new ProviderCredentialsService(configWith());
    expect(store.get('linkedin')).toBeNull();
    expect(store.configured()).toEqual({ linkedin: false, x: false, instagram: false, threads: false, youtube: false });

    store.set('linkedin', { clientId: ' id-1 ', clientSecret: ' s3cret ' });
    expect(store.get('linkedin')).toEqual({ clientId: 'id-1', clientSecret: 's3cret' });
    expect(store.configured()).toEqual({ linkedin: true, x: false, instagram: false, threads: false, youtube: false });

    store.delete('linkedin');
    expect(store.get('linkedin')).toBeNull();
  });

  it('writes owner-only (0600) and encrypts the secret at rest when a key is set', () => {
    const path = freshPath();
    process.env.PROVIDER_CREDENTIALS_PATH = path;
    const store = new ProviderCredentialsService(configWith({ TOKEN_ENCRYPTION_KEY: 'k' }));
    store.set('linkedin', { clientId: 'id-1', clientSecret: 'super-secret' });

    const mode = statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
    const raw = readFileSync(path, 'utf8');
    expect(raw).not.toContain('super-secret'); // encrypted at rest
    expect(raw).toContain('enc:v1:');
    // …but decrypts on read.
    expect(store.get('linkedin')?.clientSecret).toBe('super-secret');
  });
});

describe('IntegrationRegistry with in-app provider credentials', () => {
  const realPath = process.env.PROVIDER_CREDENTIALS_PATH;
  afterEach(() => {
    if (realPath) process.env.PROVIDER_CREDENTIALS_PATH = realPath;
    else delete process.env.PROVIDER_CREDENTIALS_PATH;
  });

  it('upgrades linkedin from mock to real when stored creds appear, and invalidates', () => {
    process.env.PROVIDER_CREDENTIALS_PATH = freshPath();
    const creds = new ProviderCredentialsService(configWith());
    const registry = new IntegrationRegistry(configWith() as ConfigService, noTokens, creds);

    // Nothing configured anywhere → mock, and OAuth would refuse to start.
    expect(registry.get('linkedin')).toBeInstanceOf(MockIntegration);

    // Saving creds in-app upgrades the integration without a restart.
    creds.set('linkedin', { clientId: 'id', clientSecret: 'secret' });
    registry.invalidate('linkedin');
    expect(registry.get('linkedin')).toBeInstanceOf(LinkedInIntegration);

    // Removing them drops back to the mock.
    creds.delete('linkedin');
    registry.invalidate('linkedin');
    expect(registry.get('linkedin')).toBeInstanceOf(MockIntegration);
  });

  it('forPublish uses a real token-only client for a connected account even without app creds', async () => {
    // Publishing is token-only on every platform — a connected account must
    // never fall back to the mock (which fabricates a success).
    process.env.PROVIDER_CREDENTIALS_PATH = freshPath();
    const creds = new ProviderCredentialsService(configWith());
    const linkedinToken = {
      platform: 'linkedin' as const,
      accessToken: 't',
      expiresAt: Date.now() + 1e6,
      scopes: [],
      accountId: 'urn:li:person:abc',
    };
    const tokens = { get: async () => linkedinToken } as unknown as TokenStore;
    const registry = new IntegrationRegistry(configWith() as ConfigService, tokens, creds);

    expect(await registry.forPublish('linkedin')).toBeInstanceOf(LinkedInIntegration);
  });

  it('env-configured credentials still win over the store', () => {
    process.env.PROVIDER_CREDENTIALS_PATH = freshPath();
    const creds = new ProviderCredentialsService(configWith());
    const registry = new IntegrationRegistry(
      configWith({
        'integrations.linkedin.clientId': 'env-id',
        'integrations.linkedin.clientSecret': 'env-secret',
      }) as ConfigService,
      noTokens,
      creds,
    );
    expect(registry.get('linkedin')).toBeInstanceOf(LinkedInIntegration);
  });
});
