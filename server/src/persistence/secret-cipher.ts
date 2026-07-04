import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Shared AES-256-GCM secret cipher — the encryption-at-rest primitive used by
 * the token store and the provider-credentials store. Pure Node `crypto` (no
 * native modules) so it works under every driver and the desktop bundle.
 *
 * Values are self-describing (`enc:v1:` prefix); plaintext reads through
 * unchanged, so turning encryption on is a non-breaking migration.
 */
export const SECRET_PREFIX = 'enc:v1:';

/** Derive a fixed 32-byte key from a configured secret of any length. */
export function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptSecret(key: Buffer, plain: string): string {
  const iv = randomBytes(12); // 96-bit nonce, standard for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SECRET_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptSecret(key: Buffer, value: string): string {
  if (!value.startsWith(SECRET_PREFIX)) return value; // legacy plaintext — read through
  const [iv, tag, ct] = value.slice(SECRET_PREFIX.length).split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}
