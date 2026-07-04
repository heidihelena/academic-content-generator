import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import type { Platform } from '../domain/types';
import { decryptSecret, deriveKey, encryptSecret } from '../persistence/secret-cipher';

/**
 * Provider (OAuth app) credentials entered in the app — the Client ID/Secret a
 * platform like LinkedIn issues for *your* developer app, as opposed to the
 * user tokens the OAuth flow later stores in the TokenStore.
 *
 * Why a separate store: the desktop app's bundled server never reads
 * `server/.env`, and the writable local-settings file is non-secret by design.
 * This file lives at `~/forskai/provider-credentials.json` (owner-only, 0600),
 * with the secret encrypted at rest when `TOKEN_ENCRYPTION_KEY` is set.
 *
 * Precedence stays local-first & swap-by-config: an explicit env var
 * (LINKEDIN_CLIENT_ID/SECRET) wins over this store, which wins over nothing.
 * Values are never returned by the API — only configured/not-configured.
 */
export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
}

/** OAuth platforms whose app credentials can be supplied in the app.
 *  Instagram and Threads use a Meta (Facebook) developer app's ID/Secret;
 *  YouTube uses a Google Cloud OAuth client with the Data API v3 enabled. */
export const PROVIDER_CREDENTIAL_PLATFORMS: Platform[] = [
  'linkedin',
  'x',
  'instagram',
  'threads',
  'youtube',
];

export function providerCredentialsPath(): string {
  return (
    process.env.PROVIDER_CREDENTIALS_PATH ?? join(homedir(), 'forskai', 'provider-credentials.json')
  );
}

type FileShape = Partial<Record<string, { clientId: string; clientSecret: string }>>;

@Injectable()
export class ProviderCredentialsService {
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const secret = config.get<string>('TOKEN_ENCRYPTION_KEY');
    this.key = secret && secret.trim() ? deriveKey(secret) : null;
  }

  get(platform: Platform): ProviderCredentials | null {
    const entry = this.read()[platform];
    if (!entry?.clientId || !entry.clientSecret) return null;
    try {
      return {
        clientId: entry.clientId,
        clientSecret: this.key ? decryptSecret(this.key, entry.clientSecret) : entry.clientSecret,
      };
    } catch {
      // Wrong key or tampered ciphertext — treat as not configured.
      return null;
    }
  }

  set(platform: Platform, creds: ProviderCredentials): void {
    const data = this.read();
    data[platform] = {
      clientId: creds.clientId.trim(),
      clientSecret: this.key
        ? encryptSecret(this.key, creds.clientSecret.trim())
        : creds.clientSecret.trim(),
    };
    this.write(data);
  }

  delete(platform: Platform): void {
    const data = this.read();
    delete data[platform];
    this.write(data);
  }

  /** Which platforms have stored credentials — booleans only, never values. */
  configured(): Partial<Record<Platform, boolean>> {
    const data = this.read();
    const out: Partial<Record<Platform, boolean>> = {};
    for (const p of PROVIDER_CREDENTIAL_PLATFORMS) {
      out[p] = Boolean(data[p]?.clientId && data[p]?.clientSecret);
    }
    return out;
  }

  private read(): FileShape {
    try {
      const path = providerCredentialsPath();
      if (!existsSync(path)) return {};
      return JSON.parse(readFileSync(path, 'utf8')) as FileShape;
    } catch {
      return {};
    }
  }

  private write(data: FileShape): void {
    const path = providerCredentialsPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    chmodSync(path, 0o600); // enforce 0600 even when overwriting
  }
}
