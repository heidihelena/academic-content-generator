import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Platform } from '../domain/types';
import { TOKEN_STORE, type TokenStore } from '../persistence/repository.interfaces';
import type { PlatformIntegration } from './integration.types';
import { MockIntegration } from './mock.integration';
import { InstagramIntegration } from './instagram.integration';
import { ThreadsIntegration } from './threads.integration';
import { LinkedInIntegration } from './linkedin.integration';
import { BlueskyIntegration } from './bluesky.integration';
import { MastodonIntegration } from './mastodon.integration';

/**
 * Maps each platform to its integration. Per platform, a real client is used
 * when its OAuth credentials are configured; otherwise it falls back to the
 * mock — so the app runs out of the box and you can go live one platform at a
 * time just by adding env vars (see docs/PLATFORM_SETUP.md).
 */
@Injectable()
export class IntegrationRegistry {
  private readonly logger = new Logger(IntegrationRegistry.name);
  private readonly integrations: Record<Platform, PlatformIntegration>;

  constructor(
    private readonly config: ConfigService,
    @Inject(TOKEN_STORE) private readonly tokens: TokenStore,
  ) {
    this.integrations = {
      bluesky: this.buildBluesky(config),
      mastodon: this.buildMastodon(config),
      instagram: this.buildInstagram(config),
      linkedin: this.buildLinkedIn(config),
      threads: this.buildThreads(config),
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
    return this.integrations[platform];
  }

  /**
   * The integration to *publish* a connected account with. When a platform is
   * env-configured we use that real client. Otherwise, if the account was
   * connected in-app (a session token is stored), we build a real client that
   * publishes with that token — so an in-app connect actually posts instead of
   * silently hitting the mock. Falls back to the configured client.
   *
   * Bluesky publishes purely from the stored token (DID + session JWT), so it
   * needs no env app password. (Mastodon also needs its instance URL, which is
   * only available when env-configured.)
   */
  async forPublish(platform: Platform): Promise<PlatformIntegration> {
    const configured = this.integrations[platform];
    if (!(configured instanceof MockIntegration)) return configured;
    if (!(await this.tokens.get(platform))) return configured;
    const real = this.realFromToken(platform);
    if (real) {
      this.logger.log(`${platform}: publishing the in-app-connected account with its stored token`);
      return real;
    }
    return configured;
  }

  /** A real client that can publish using only a stored token, or null if the
   *  platform also needs configuration the token doesn't carry. */
  private realFromToken(platform: Platform): PlatformIntegration | null {
    if (platform === 'bluesky') {
      const service =
        this.config.get<string>('integrations.bluesky.service') ?? 'https://bsky.social';
      return new BlueskyIntegration(service, '', '');
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
