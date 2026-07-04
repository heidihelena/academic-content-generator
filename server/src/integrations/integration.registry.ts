import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AccessToken, Platform } from '../domain/types';
import { ProviderCredentialsService } from '../accounts/provider-credentials';
import { TOKEN_STORE, type TokenStore } from '../persistence/repository.interfaces';
import type { PlatformIntegration } from './integration.types';
import { MockIntegration } from './mock.integration';
import { InstagramIntegration } from './instagram.integration';
import { ThreadsIntegration } from './threads.integration';
import { LinkedInIntegration } from './linkedin.integration';
import { BlueskyIntegration } from './bluesky.integration';
import { XIntegration } from './x.integration';
import { MastodonIntegration } from './mastodon.integration';

/**
 * Maps each platform to its integration. Per platform, a real client is used
 * when its provider credentials are configured. Otherwise the registry keeps a
 * mock for local/offline seams; API-mode OAuth refuses to start from a mock.
 */
@Injectable()
export class IntegrationRegistry {
  private readonly logger = new Logger(IntegrationRegistry.name);
  private readonly integrations: Record<Platform, PlatformIntegration>;
  /** Real clients built from in-app provider credentials (see get()). */
  private readonly fromStore: Partial<Record<Platform, PlatformIntegration>> = {};

  constructor(
    private readonly config: ConfigService,
    @Inject(TOKEN_STORE) private readonly tokens: TokenStore,
    @Optional() private readonly providerCreds?: ProviderCredentialsService,
  ) {
    this.integrations = {
      bluesky: this.buildBluesky(config),
      mastodon: this.buildMastodon(config),
      instagram: this.buildInstagram(config),
      linkedin: this.buildLinkedIn(config),
      threads: this.buildThreads(config),
      x: this.buildX(config),
      // YouTube ships mock-only: Shorts are planned in-app and exported/uploaded
      // manually (the Data API upload flow needs OAuth + quota review).
      youtube: new MockIntegration('youtube', {
        handle: '@heidi-does-science',
        displayName: 'Heidi does science',
        followers: 5400,
      }),
    };
  }

  get(platform: Platform): PlatformIntegration {
    const base = this.integrations[platform];
    // Env-configured real client always wins (swap-by-config precedence).
    if (!(base instanceof MockIntegration)) return base;
    // Otherwise, in-app provider credentials can upgrade the mock to a real
    // client — this is how the desktop app (which never reads .env) goes live.
    const cached = this.fromStore[platform];
    if (cached) return cached;
    const real = this.buildFromStoredCreds(platform);
    if (real) {
      this.logger.log(`${platform}: using real integration from in-app provider credentials`);
      this.fromStore[platform] = real;
      return real;
    }
    return base;
  }

  /** Drop the cached store-built client after credentials change. */
  invalidate(platform: Platform): void {
    delete this.fromStore[platform];
  }

  private buildFromStoredCreds(platform: Platform): PlatformIntegration | null {
    const creds = this.providerCreds?.get(platform);
    if (!creds) return null;
    if (platform === 'linkedin') {
      const version = this.config.get<string>('integrations.linkedin.version') ?? '202401';
      return new LinkedInIntegration(creds.clientId, creds.clientSecret, version);
    }
    if (platform === 'x') return new XIntegration(creds.clientId, creds.clientSecret);
    // Meta developer app (Facebook) credentials power both Instagram and Threads.
    if (platform === 'instagram') return new InstagramIntegration(creds.clientId, creds.clientSecret);
    if (platform === 'threads') return new ThreadsIntegration(creds.clientId, creds.clientSecret);
    return null;
  }

  /**
   * The integration to *publish* a connected account with. When a platform is
   * env-configured we use that real client. Otherwise, if the account was
   * connected in-app (a session token is stored), we build a real client that
   * publishes with that token — so an in-app connect actually posts instead of
   * silently hitting the mock. Falls back to the configured client.
   *
   * Bluesky and Mastodon publish from the stored token plus a non-secret service
   * URL captured during in-app verification, so they do not need env secrets
   * after the account is connected.
   */
  async forPublish(platform: Platform): Promise<PlatformIntegration> {
    const configured = this.get(platform);
    if (!(configured instanceof MockIntegration)) return configured;
    const token = await this.tokens.get(platform);
    if (!token) return configured;
    const real = this.realFromToken(platform, token);
    if (real) {
      this.logger.log(`${platform}: publishing the in-app-connected account with its stored token`);
      return real;
    }
    return configured;
  }

  /** A real client that can publish using only a stored token, or null if the
   *  platform also needs configuration the token doesn't carry. */
  private realFromToken(platform: Platform, token: AccessToken): PlatformIntegration | null {
    if (platform === 'bluesky') {
      const service =
        token.serviceUrl ??
        this.config.get<string>('integrations.bluesky.service') ?? 'https://bsky.social';
      return new BlueskyIntegration(service, '', '');
    }
    if (platform === 'mastodon') {
      const instance = token.serviceUrl ?? this.config.get<string>('integrations.mastodon.instance');
      return instance ? new MastodonIntegration(instance, '') : null;
    }
    return null;
  }

  private buildInstagram(config: ConfigService): PlatformIntegration {
    const id = config.get<string>('integrations.instagram.clientId');
    const secret = config.get<string>('integrations.instagram.clientSecret');
    if (id && secret) {
      this.logger.log('Instagram: using real Graph API integration');
      return new InstagramIntegration(id, secret);
    }
    return new MockIntegration('instagram', { handle: '@vahtian', displayName: 'vahtian', followers: 18420 });
  }

  private buildThreads(config: ConfigService): PlatformIntegration {
    const id = config.get<string>('integrations.threads.clientId');
    const secret = config.get<string>('integrations.threads.clientSecret');
    if (id && secret) {
      this.logger.log('Threads: using real Threads API integration');
      return new ThreadsIntegration(id, secret);
    }
    return new MockIntegration('threads', { handle: '@vahtian', displayName: 'vahtian', followers: 4210 });
  }

  private buildX(config: ConfigService): PlatformIntegration {
    const id = config.get<string>('integrations.x.clientId');
    const secret = config.get<string>('integrations.x.clientSecret');
    if (id && secret) {
      this.logger.log('X: using real X v2 API integration (OAuth2 PKCE)');
      return new XIntegration(id, secret);
    }
    // Mock until a paid X developer app is configured (X_CLIENT_ID/SECRET).
    return new MockIntegration('x', { handle: '@vahtian', displayName: 'vahtian', followers: 1980 });
  }

  private buildLinkedIn(config: ConfigService): PlatformIntegration {
    const id = config.get<string>('integrations.linkedin.clientId');
    const secret = config.get<string>('integrations.linkedin.clientSecret');
    const version = config.get<string>('integrations.linkedin.version') ?? '202401';
    if (id && secret) {
      this.logger.log('LinkedIn: using real Posts API integration');
      return new LinkedInIntegration(id, secret, version);
    }
    return new MockIntegration('linkedin', { handle: 'vahtian', displayName: 'vahtian Inc.', followers: 7650 });
  }

  private buildBluesky(config: ConfigService): PlatformIntegration {
    const service = config.get<string>('integrations.bluesky.service') ?? 'https://bsky.social';
    const identifier = config.get<string>('integrations.bluesky.identifier');
    const appPassword = config.get<string>('integrations.bluesky.appPassword');
    if (identifier && appPassword) {
      this.logger.log('Bluesky: using real AT Protocol integration');
      return new BlueskyIntegration(service, identifier, appPassword);
    }
    return new MockIntegration('bluesky', {
      handle: '@heidiandersen.bsky.social',
      displayName: 'Dr. Heidi Andersen',
      followers: 3120,
    });
  }

  private buildMastodon(config: ConfigService): PlatformIntegration {
    const instance = config.get<string>('integrations.mastodon.instance');
    const accessToken = config.get<string>('integrations.mastodon.accessToken');
    if (instance && accessToken) {
      this.logger.log('Mastodon: using real instance API integration');
      return new MastodonIntegration(instance, accessToken);
    }
    return new MockIntegration('mastodon', {
      handle: '@heidiandersen@fediscience.org',
      displayName: 'Dr. Heidi Andersen',
      followers: 1840,
    });
  }
}
