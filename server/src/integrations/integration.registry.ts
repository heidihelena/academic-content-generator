import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Platform } from '../domain/types';
import type { PlatformIntegration } from './integration.types';
import { MockIntegration } from './mock.integration';
import { InstagramIntegration } from './instagram.integration';
import { ThreadsIntegration } from './threads.integration';
import { LinkedInIntegration } from './linkedin.integration';

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

  constructor(config: ConfigService) {
    this.integrations = {
      instagram: this.buildInstagram(config),
      linkedin: this.buildLinkedIn(config),
      threads: this.buildThreads(config),
    };
  }

  get(platform: Platform): PlatformIntegration {
    return this.integrations[platform];
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
}
