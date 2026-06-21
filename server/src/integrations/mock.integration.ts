import { randomUUID } from 'crypto';
import type { AccessToken, ConnectedAccount, Platform, Post } from '../domain/types';
import type {
  ConnectParams,
  OAuthResult,
  PlatformIntegration,
  PublishResult,
} from './integration.types';

interface MockOptions {
  handle: string;
  displayName: string;
  followers: number;
  failConnect?: boolean;
}

/** Mock integration: fabricates plausible accounts, tokens and publish results
 *  so the whole pipeline is exercisable without real credentials. */
export class MockIntegration implements PlatformIntegration {
  constructor(
    public readonly platform: Platform,
    private readonly options: MockOptions,
  ) {}

  authorizeUrl(redirectUri: string, state: string): string {
    // The mock "consent screen" instantly approves: it points straight back at
    // our callback with a fake code, so the full authorize→callback→connect loop
    // is exercisable without a real provider. A real client returns the
    // platform's hosted consent URL instead.
    const params = new URLSearchParams({ code: `mock_code_${this.platform}`, state });
    return `${redirectUri}?${params.toString()}`;
  }

  async connect(_params?: ConnectParams): Promise<OAuthResult> {
    if (this.options.failConnect) {
      throw new Error(`Authorization denied for ${this.platform}`);
    }
    const token: AccessToken = {
      platform: this.platform,
      accessToken: `tok_${randomUUID()}`,
      refreshToken: `rtok_${randomUUID()}`,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 60,
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
    return { account, token };
  }

  async disconnect(): Promise<void> {
    /* no-op for the mock */
  }

  async publish(_post: Post, _token: AccessToken): Promise<PublishResult> {
    return {
      remoteId: `remote_${randomUUID()}`,
      permalink: `https://${this.platform}.example/p/${randomUUID()}`,
    };
  }
}
