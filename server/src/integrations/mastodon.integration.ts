import type { AccessToken, ConnectedAccount, Post } from '../domain/types';
import type {
  ConnectParams,
  OAuthResult,
  PlatformIntegration,
  PublishOptions,
  PublishResult,
  ReplyRef,
} from './integration.types';
import { apiFetch } from './http';

/**
 * Real Mastodon client using the instance REST API.
 *
 * Mastodon is federated, so there's no single OAuth provider. The simplest way
 * to go live is a per-account **access token**: on your instance, Preferences →
 * Development → New application → copy the access token. Supply it via
 * MASTODON_INSTANCE (e.g. https://fediscience.org) + MASTODON_ACCESS_TOKEN.
 * See docs/PLATFORM_SETUP.md.
 */

const JSON_HEADERS = { 'content-type': 'application/json' };

/** Build the POST /api/v1/statuses body; chains a reply when a parent exists. */
export function buildStatusBody(post: Post, reply?: ReplyRef) {
  return {
    status: post.body,
    visibility: 'public' as const,
    ...(reply ? { in_reply_to_id: reply.parent.uri } : {}),
  };
}

export class MastodonIntegration implements PlatformIntegration {
  readonly platform = 'mastodon' as const;

  constructor(
    private readonly instance: string,
    private readonly accessToken: string,
  ) {}

  private url(path: string): string {
    return `${this.instance.replace(/\/$/, '')}${path}`;
  }

  authorizeUrl(redirectUri: string, state: string): string {
    // Token-based auth: no hosted consent screen — bounce back to the callback,
    // which calls connect() using the configured access token.
    const params = new URLSearchParams({ code: 'mastodon', state });
    return `${redirectUri}?${params.toString()}`;
  }

  async connect(_params?: ConnectParams): Promise<OAuthResult> {
    const me = await apiFetch<{
      username: string;
      acct: string;
      display_name?: string;
      followers_count?: number;
      url?: string;
    }>('mastodon', this.url('/api/v1/accounts/verify_credentials'), {
      headers: { authorization: `Bearer ${this.accessToken}` },
    });

    // Derive a fully-qualified handle (@user@instance) from the instance host.
    const host = this.instance.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const token: AccessToken = {
      platform: 'mastodon',
      accessToken: this.accessToken,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365, // Mastodon tokens are long-lived
      scopes: ['read', 'write'],
      accountId: host,
    };
    const account: ConnectedAccount = {
      platform: 'mastodon',
      status: 'connected',
      handle: `@${me.username}@${host}`,
      displayName: me.display_name || me.username,
      followers: me.followers_count,
      lastSyncedAt: new Date().toISOString(),
    };
    return { account, token };
  }

  async disconnect(): Promise<void> {
    // Revoke the token in the instance's app settings to fully invalidate.
  }

  async publish(post: Post, token: AccessToken, opts?: PublishOptions): Promise<PublishResult> {
    const status = await apiFetch<{ id: string; url: string }>(
      'mastodon',
      this.url('/api/v1/statuses'),
      {
        method: 'POST',
        headers: {
          ...JSON_HEADERS,
          authorization: `Bearer ${token.accessToken}`,
          // Dedupe retries (the scheduler may re-run) so we never double-post.
          'idempotency-key': post.id,
        },
        body: JSON.stringify(buildStatusBody(post, opts?.reply)),
      },
    );
    return { remoteId: status.id, permalink: status.url };
  }
}
