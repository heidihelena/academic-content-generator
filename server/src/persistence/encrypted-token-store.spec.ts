import type { AccessToken } from '../domain/types';
import type { TokenStore } from './repository.interfaces';
import { EncryptedTokenStore, maybeEncryptTokenStore } from './encrypted-token-store';

/** Minimal in-memory inner store so we can inspect exactly what hits "disk". */
class FakeInnerStore implements TokenStore {
  readonly rows = new Map<AccessToken['platform'], AccessToken>();
  async get(platform: AccessToken['platform']): Promise<AccessToken | null> {
    return this.rows.get(platform) ?? null;
  }
  async set(token: AccessToken): Promise<void> {
    this.rows.set(token.platform, token);
  }
  async delete(platform: AccessToken['platform']): Promise<void> {
    this.rows.delete(platform);
  }
}

const sample = (): AccessToken => ({
  platform: 'bluesky',
  accessToken: 'super-secret-access',
  refreshToken: 'super-secret-refresh',
  expiresAt: 1_700_000_000_000,
  scopes: ['read', 'write'],
  accountId: 'did:plc:abc123',
});

describe('EncryptedTokenStore', () => {
  it('round-trips a token transparently through encryption', async () => {
    const inner = new FakeInnerStore();
    const store = new EncryptedTokenStore(inner, 'unit-test-secret');

    const token = sample();
    await store.set(token);

    expect(await store.get('bluesky')).toEqual(token);
  });

  it('persists ciphertext, not plaintext, in the inner store', async () => {
    const inner = new FakeInnerStore();
    const store = new EncryptedTokenStore(inner, 'unit-test-secret');

    await store.set(sample());
    const stored = inner.rows.get('bluesky')!;

    // Secret fields are encrypted with the enc:v1: envelope...
    expect(stored.accessToken).toMatch(/^enc:v1:/);
    expect(stored.refreshToken).toMatch(/^enc:v1:/);
    expect(stored.accessToken).not.toContain('super-secret-access');
    expect(stored.refreshToken).not.toContain('super-secret-refresh');
    // ...while non-secret fields stay in clear text so the driver can query them.
    expect(stored.expiresAt).toBe(1_700_000_000_000);
    expect(stored.scopes).toEqual(['read', 'write']);
    expect(stored.accountId).toBe('did:plc:abc123');
  });

  it('handles a token without a refresh token', async () => {
    const inner = new FakeInnerStore();
    const store = new EncryptedTokenStore(inner, 'unit-test-secret');

    const token = sample();
    delete token.refreshToken;
    await store.set(token);

    expect(inner.rows.get('bluesky')!.refreshToken).toBeUndefined();
    expect(await store.get('bluesky')).toEqual(token);
  });

  it('reads legacy plaintext tokens through unchanged', async () => {
    const inner = new FakeInnerStore();
    // A token written before encryption was enabled: stored as plaintext.
    await inner.set(sample());

    const store = new EncryptedTokenStore(inner, 'unit-test-secret');
    expect(await store.get('bluesky')).toEqual(sample());
  });

  it('returns null (reconnect needed) when decrypted with the wrong key', async () => {
    const inner = new FakeInnerStore();
    await new EncryptedTokenStore(inner, 'the-right-key').set(sample());

    const wrong = new EncryptedTokenStore(inner, 'a-different-key');
    expect(await wrong.get('bluesky')).toBeNull();
  });

  it('uses a fresh nonce per write (same plaintext → different ciphertext)', async () => {
    const inner = new FakeInnerStore();
    const store = new EncryptedTokenStore(inner, 'unit-test-secret');

    await store.set(sample());
    const first = inner.rows.get('bluesky')!.accessToken;
    await store.set(sample());
    const second = inner.rows.get('bluesky')!.accessToken;

    expect(first).not.toBe(second);
  });

  it('delegates delete to the inner store', async () => {
    const inner = new FakeInnerStore();
    const store = new EncryptedTokenStore(inner, 'unit-test-secret');

    await store.set(sample());
    await store.delete('bluesky');

    expect(inner.rows.has('bluesky')).toBe(false);
  });
});

describe('maybeEncryptTokenStore', () => {
  it('wraps the store when a key is configured', () => {
    const inner = new FakeInnerStore();
    expect(maybeEncryptTokenStore(inner, 'a-key')).toBeInstanceOf(EncryptedTokenStore);
  });

  it('returns the store unchanged when no key is set', () => {
    const inner = new FakeInnerStore();
    expect(maybeEncryptTokenStore(inner, undefined)).toBe(inner);
    expect(maybeEncryptTokenStore(inner, '   ')).toBe(inner);
  });
});
