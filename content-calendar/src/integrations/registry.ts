import type { Platform } from '../types';
import type { PlatformIntegration } from './types';
import { MockPlatformIntegration } from './mockIntegration';

/**
 * Integration registry — the single place that maps a platform to its
 * `PlatformIntegration` implementation.
 *
 * // --- REAL API INTEGRATION POINT -----------------------------------------
 * // To go live, replace the MockPlatformIntegration instances below with real
 * // clients (e.g. new InstagramGraphIntegration(config)). Nothing else in the
 * // app references concrete implementations, so this file is the only swap.
 * // ------------------------------------------------------------------------
 */
const integrations: Record<Platform, PlatformIntegration> = {
  instagram: new MockPlatformIntegration('instagram', {
    handle: '@vahtian',
    displayName: 'vahtian',
    followers: 18420,
  }),
  linkedin: new MockPlatformIntegration('linkedin', {
    handle: 'vahtian',
    displayName: 'vahtian Inc.',
    followers: 7650,
  }),
  threads: new MockPlatformIntegration('threads', {
    handle: '@vahtian',
    displayName: 'vahtian',
    followers: 4210,
    // Demonstrates the error/retry path in the connected-accounts UI.
    failConnect: true,
  }),
};

export function getIntegration(platform: Platform): PlatformIntegration {
  return integrations[platform];
}

/** Test/override hook so suites can inject deterministic integrations. */
export function __setIntegration(platform: Platform, integration: PlatformIntegration): void {
  integrations[platform] = integration;
}
