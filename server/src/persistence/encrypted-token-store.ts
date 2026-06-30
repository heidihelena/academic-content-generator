import { Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { AccessToken } from '../domain/types';
import type { TokenStore } from './repository.interfaces';

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
const PREFIX = 'enc:v1:';

export class EncryptedTokenStore implements TokenStore {
  private readonly key: Buffer;
  private readonly logger = new Logger(EncryptedTokenStore.name);

  constructor(
    private readonly inner: TokenStore,
    secret: string,
  ) {
    // Derive a fixed 32-byte key from the configured secret (any length input).
    this.key = createHash('sha256').update(secret, 'utf8').digest();
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
    const iv = randomBytes(12); // 96-bit nonce, standard for GCM
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
  }

  private decrypt(value: string): string {
    if (!value.startsWith(PREFIX)) return value; // legacy plaintext — read through
    const [iv, tag, ct] = value.slice(PREFIX.length).split(':');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
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
