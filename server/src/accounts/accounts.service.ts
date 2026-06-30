import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ConnectedAccount, Platform } from '../domain/types';
import {
  ACCOUNTS_REPOSITORY,
  TOKEN_STORE,
  type AccountsRepository,
  type TokenStore,
} from '../persistence/repository.interfaces';
import { IntegrationRegistry } from '../integrations/integration.registry';
import type { ConnectParams, PlatformIntegration } from '../integrations/integration.types';
import { BlueskyIntegration } from '../integrations/bluesky.integration';
import { MastodonIntegration } from '../integrations/mastodon.integration';

// Seed a row for every supported destination so the Accounts UI always shows a
// Connect control. Bluesky + Mastodon come first: they connect with an in-app
// app password / access token (no OAuth app needed), so they work on a fresh
// local install — the others connect via an OAuth redirect.
const PLATFORMS: Platform[] = ['bluesky', 'mastodon', 'instagram', 'linkedin', 'threads', 'x'];
const OAUTH_PLATFORMS: Platform[] = ['instagram', 'linkedin', 'threads', 'x'];

/** Credentials a user can supply in-app for the token/app-password platforms. */
export interface PlatformCredentials {
  /** Bluesky PDS, defaults to https://bsky.social. */
  service?: string;
  /** Bluesky handle/email. */
  identifier?: string;
  /** Bluesky app password. */
  appPassword?: string;
  /** Mastodon instance URL. */
  instance?: string;
  /** Mastodon access token. */
  accessToken?: string;
}

@Injectable()
export class AccountsService implements OnModuleInit {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepository,
    @Inject(TOKEN_STORE) private readonly tokens: TokenStore,
    private readonly integrations: IntegrationRegistry,
  ) {}

  /** Seed a disconnected row per platform so the UI always has something to show. */
  async onModuleInit(): Promise<void> {
    for (const platform of PLATFORMS) {
      if (!(await this.accounts.findByPlatform(platform))) {
        await this.accounts.upsert({ platform, status: 'disconnected' });
      }
    }
  }

  list(): Promise<ConnectedAccount[]> {
    return this.accounts.list();
  }

  /**
   * Connects an account. In the real OAuth flow `code` + `redirectUri` arrive at
   * the callback endpoint. Tokens are persisted in the TokenStore — never in the
   * vault or returned to the client.
   */
  async connect(platform: Platform, params?: ConnectParams): Promise<ConnectedAccount> {
    if (OAUTH_PLATFORMS.includes(platform) && !params?.code) {
      return this.accounts.upsert({
        platform,
        status: 'error',
        statusDetail: `Start OAuth at /api/accounts/oauth/${platform}/authorize before connecting.`,
      });
    }
    try {
      const { account, token } = await this.integrations.get(platform).connect(params);
      await this.tokens.set(token);
      return this.accounts.upsert(account);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Connection failed';
      return this.accounts.upsert({ platform, status: 'error', statusDetail: detail });
    }
  }

  /**
   * Verify user-supplied credentials by actually connecting with them, then
   * persist the token + account on success. Throws (400) on bad credentials so
   * the UI can show "couldn't connect — check and retry" (verify-or-redo).
   * Only the app-password/token platforms (Bluesky, Mastodon) use this; the
   * OAuth platforms go through the authorize→callback flow instead.
   */
  async verify(platform: Platform, creds: PlatformCredentials): Promise<ConnectedAccount> {
    const integration = this.makeIntegration(platform, creds);
    try {
      const { account, token } = await integration.connect();
      await this.tokens.set(token);
      return this.accounts.upsert(account);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Could not connect';
      throw new BadRequestException(`Couldn't connect to ${platform}: ${detail}`);
    }
  }

  /** Build a transient integration from supplied credentials (overridable in tests). */
  protected makeIntegration(platform: Platform, creds: PlatformCredentials): PlatformIntegration {
    if (platform === 'bluesky') {
      if (!creds.identifier || !creds.appPassword) {
        throw new BadRequestException('Bluesky needs an identifier and an app password.');
      }
      return new BlueskyIntegration(creds.service || 'https://bsky.social', creds.identifier, creds.appPassword);
    }
    if (platform === 'mastodon') {
      if (!creds.instance || !creds.accessToken) {
        throw new BadRequestException('Mastodon needs an instance URL and an access token.');
      }
      return new MastodonIntegration(creds.instance, creds.accessToken);
    }
    throw new BadRequestException(`${platform} connects via OAuth, not credentials.`);
  }

  async disconnect(platform: Platform): Promise<ConnectedAccount> {
    const token = await this.tokens.get(platform);
    if (token) await this.integrations.get(platform).disconnect(token);
    await this.tokens.delete(platform);
    return this.accounts.upsert({ platform, status: 'disconnected' });
  }
}
