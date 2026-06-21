import type { ConnectedAccount, Platform, Post } from '../types';
import { getPlatformMeta } from '../lib/platforms';
import { createId } from '../lib/id';
import type {
  AccessToken,
  OAuthResult,
  PlatformIntegration,
  PublishResult,
} from './types';

/** Simulates network latency so loading states are exercised in the demo. */
function delay<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * A configurable mock implementation of `PlatformIntegration`.
 *
 * It fabricates a plausible account profile and tokens so the connected-accounts
 * UI is fully exercisable without real credentials. `failConnect` lets the demo
 * (and tests) drive the error path.
 */
export class MockPlatformIntegration implements PlatformIntegration {
  constructor(
    public readonly platform: Platform,
    private readonly options: {
      handle: string;
      displayName: string;
      followers: number;
      failConnect?: boolean;
      latencyMs?: number;
    },
  ) {}

  async connect(): Promise<OAuthResult> {
    const latency = this.options.latencyMs ?? 700;
    if (this.options.failConnect) {
      await delay(null, latency);
      throw new Error(
        `Could not connect ${getPlatformMeta(this.platform).name}. Authorization was denied.`,
      );
    }
    const token: AccessToken = {
      accessToken: createId('tok'),
      refreshToken: createId('rtok'),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 60, // 60 days
      scopes: ['read_profile', 'publish_content'],
    };
    const account: ConnectedAccount = {
      platform: this.platform,
      status: 'connected',
      handle: this.options.handle,
      displayName: this.options.displayName,
      followers: this.options.followers,
      lastSyncedAt: new Date().toISOString(),
    };
    return delay({ account, token }, latency);
  }

  async disconnect(_token: AccessToken): Promise<void> {
    await delay(null, 300);
  }

  async refreshStatus(_token: AccessToken): Promise<ConnectedAccount> {
    return delay(
      {
        platform: this.platform,
        status: 'connected' as const,
        handle: this.options.handle,
        displayName: this.options.displayName,
        followers: this.options.followers,
        lastSyncedAt: new Date().toISOString(),
      },
      400,
    );
  }

  async publish(_post: Post, _token: AccessToken): Promise<PublishResult> {
    return delay(
      {
        remoteId: createId('remote'),
        permalink: `https://${this.platform}.example/p/${createId('p')}`,
      },
      500,
    );
  }
}
