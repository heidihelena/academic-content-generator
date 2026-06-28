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
  bluesky: new MockPlatformIntegration('bluesky', {
    handle: '@heidiandersen.bsky.social',
    displayName: 'Dr. Heidi Andersen',
    followers: 3120,
  }),
  mastodon: new MockPlatformIntegration('mastodon', {
    handle: '@heidiandersen@fediscience.org',
    displayName: 'Dr. Heidi Andersen',
    followers: 1840,
  }),
  linkedin: new MockPlatformIntegration('linkedin', {
    handle: 'heidi-andersen',
    displayName: 'Heidi Andersen, PhD',
    followers: 4860,
  }),
  instagram: new MockPlatformIntegration('instagram', {
    handle: '@heidi.does.science',
    displayName: 'Heidi does science',
    followers: 2240,
  }),
  threads: new MockPlatformIntegration('threads', {
    handle: '@heidi.does.science',
    displayName: 'Heidi does science',
    followers: 980,
    // Demonstrates the error/retry path in the connected-accounts UI.
    failConnect: true,
  }),
  x: new MockPlatformIntegration('x', {
    handle: '@vahtian',
    displayName: 'vahtian',
    followers: 1980,
  }),
  youtube: new MockPlatformIntegration('youtube', {
    handle: '@heidi-does-science',
    displayName: 'Heidi does science',
    followers: 5400,
  }),
};

export function getIntegration(platform: Platform): PlatformIntegration {
  return integrations[platform];
}

/** Test/override hook so suites can inject deterministic integrations. */
export function __setIntegration(platform: Platform, integration: PlatformIntegration): void {
  integrations[platform] = integration;
}
