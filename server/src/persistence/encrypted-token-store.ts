import { Logger } from '@nestjs/common';
import type { AccessToken } from '../domain/types';
import type { TokenStore } from './repository.interfaces';
import { decryptSecret, deriveKey, encryptSecret } from './secret-cipher';

/**
 * Encryption-at-rest for the {@link TokenStore} — a decorator that wraps any
 * driver's token store and encrypts the secret fields (`accessToken`,
 * `refreshToken`) with AES-256-GCM before they hit disk, decrypting on read.
 *
 * Non-secret fields (platform, expiresAt, scopes, accountId, serviceUrl) stay
 * in clear text so the underlying store can still key/query/expire by them.
 * Pure Node `crypto` — no native modules — so it works under every driver and
 * the desktop bundle.
 *
 * Local-first, swap-by-config: this wrapper is only applied when
 * `TOKEN_ENCRYPTION_KEY` is set (see `maybeEncryptTokenStore`). Existing
 * plaintext tokens are read through unchanged and re-encrypted on their next
 * write, so turning encryption on is a non-breaking migration.
 */
export class EncryptedTokenStore implements TokenStore {
  private readonly key: Buffer;
  private readonly logger = new Logger(EncryptedTokenStore.name);

  constructor(
    private readonly inner: TokenStore,
    secret: string,
  ) {
    this.key = deriveKey(secret);
  }

  async get(platform: AccessToken['platform']): Promise<AccessToken | null> {
    const token = await this.inner.get(platform);
    if (!token) return null;
    try {
      return {
        ...token,
        accessToken: this.decrypt(token.accessToken),
        refreshToken: token.refreshToken ? this.decrypt(token.refreshToken) : undefined,
      };
    } catch (err) {
      // Wrong key or tampered ciphertext: don't crash publishing — treat the
      // account as needing a reconnect rather than returning garbage.
      this.logger.warn(`Could not decrypt the ${platform} token (re-connect needed): ${String(err)}`);
      return null;
    }
  }

  async set(token: AccessToken): Promise<void> {
    await this.inner.set({
      ...token,
      accessToken: this.encrypt(token.accessToken),
      refreshToken: token.refreshToken ? this.encrypt(token.refreshToken) : undefined,
    });
  }

  delete(platform: AccessToken['platform']): Promise<void> {
    return this.inner.delete(platform);
  }

  private encrypt(plain: string): string {
    return encryptSecret(this.key, plain);
  }

  private decrypt(value: string): string {
    return decryptSecret(this.key, value);
  }
}

/**
 * Wrap a durable driver's token store in {@link EncryptedTokenStore} when
 * `TOKEN_ENCRYPTION_KEY` is configured; otherwise return it unchanged and warn
 * once that provider tokens sit at rest in plaintext. (Not used for the memory
 * driver, which has no at-rest storage.)
 */
export function maybeEncryptTokenStore(inner: TokenStore, key?: string): TokenStore {
  if (key && key.trim()) return new EncryptedTokenStore(inner, key);
  new Logger('TokenStore').warn(
    'TOKEN_ENCRYPTION_KEY is not set — provider access/refresh tokens are stored unencrypted at rest. Set it to encrypt them.',
  );
  return inner;
}
