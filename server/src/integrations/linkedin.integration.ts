import type { AccessToken, ConnectedAccount, Post } from '../domain/types';
import type {
  ConnectParams,
  OAuthResult,
  PlatformIntegration,
  PublishResult,
} from './integration.types';
import { FORM_HEADERS, apiFetch, formBody } from './http';

/**
 * Real LinkedIn client using "Sign In with LinkedIn using OpenID Connect"
 * (profile) + the Posts API (member posting). Requires a LinkedIn app with the
 * `openid`, `profile`, and `w_member_social` scopes. See docs/PLATFORM_SETUP.md.
 *
 * This client posts text to the member's own feed. Posting to an organization
 * page, or attaching images, needs additional scopes/approval and the Images
 * API — see the setup doc.
 */
export class LinkedInIntegration implements PlatformIntegration {
  readonly platform = 'linkedin' as const;
  private readonly scopes = ['openid', 'profile', 'w_member_social'];

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    /** LinkedIn versioned API date, e.g. "202401". */
    private readonly version: string,
  ) {}

  authorizeUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async connect(params?: ConnectParams): Promise<OAuthResult> {
    if (!params?.code || !params.redirectUri) throw new Error('Missing OAuth code/redirectUri');

    const tokenRes = await apiFetch<{ access_token: string; expires_in: number }>(
      'linkedin',
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: FORM_HEADERS,
        body: formBody({
          grant_type: 'authorization_code',
          code: params.code,
          redirect_uri: params.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      },
    );

    // OpenID Connect userinfo → stable member id (`sub`).
    const profile = await apiFetch<{ sub: string; name?: string; email?: string }>(
      'linkedin',
      'https://api.linkedin.com/v2/userinfo',
      { headers: { authorization: `Bearer ${tokenRes.access_token}` } },
    );

    const token: AccessToken = {
      platform: 'linkedin',
      accessToken: tokenRes.access_token,
      expiresAt: Date.now() + tokenRes.expires_in * 1000,
      scopes: this.scopes,
      accountId: `urn:li:person:${profile.sub}`,
    };
    const account: ConnectedAccount = {
      platform: 'linkedin',
      status: 'connected',
      handle: profile.name ?? profile.email ?? 'LinkedIn member',
      displayName: profile.name ?? 'LinkedIn member',
      lastSyncedAt: new Date().toISOString(),
    };
    return { account, token };
  }

  async disconnect(): Promise<void> {
    // LinkedIn access tokens expire on their own; no revoke endpoint is used here.
  }

  async publish(post: Post, token: AccessToken): Promise<PublishResult> {
    const author = token.accountId;
    if (!author) throw new Error('Missing LinkedIn member URN on token');

    const res = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        'content-type': 'application/json',
        'LinkedIn-Version': this.version,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author,
        commentary: post.body,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`linkedin API ${res.status}: ${await res.text()}`);
    }

    // The created post URN is returned in the `x-restli-id` response header.
    const urn = res.headers.get('x-restli-id') ?? '';
    return {
      remoteId: urn,
      permalink: urn ? `https://www.linkedin.com/feed/update/${urn}` : 'https://www.linkedin.com',
    };
  }
}
