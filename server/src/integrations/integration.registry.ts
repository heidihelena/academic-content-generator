import { Injectable } from '@nestjs/common';
import type { Platform } from '../domain/types';
import type { PlatformIntegration } from './integration.types';
import { MockIntegration } from './mock.integration';

/**
 * Maps each platform to its integration implementation — the single place to
 * swap mocks for real clients.
 *
 * // --- REAL API INTEGRATION POINT -----------------------------------------
 * // Replace the MockIntegration instances with real clients, e.g.
 * //   instagram: new InstagramGraphIntegration(config)
 * // Nothing else references concrete implementations.
 * // ------------------------------------------------------------------------
 */
@Injectable()
export class IntegrationRegistry {
  private readonly integrations: Record<Platform, PlatformIntegration> = {
    instagram: new MockIntegration('instagram', {
      handle: '@vahtian',
      displayName: 'vahtian',
      followers: 18420,
    }),
    linkedin: new MockIntegration('linkedin', {
      handle: 'vahtian',
      displayName: 'vahtian Inc.',
      followers: 7650,
    }),
    threads: new MockIntegration('threads', {
      handle: '@vahtian',
      displayName: 'vahtian',
      followers: 4210,
    }),
  };

  get(platform: Platform): PlatformIntegration {
    return this.integrations[platform];
  }
}
