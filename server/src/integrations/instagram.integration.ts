import type { AccessToken, ConnectedAccount, Post } from '../domain/types';
import type {
  ConnectParams,
  OAuthResult,
  PlatformIntegration,
  PublishOptions,
  PublishResult,
} from './integration.types';
import { FORM_HEADERS, apiFetch, formBody } from './http';

/**
 * Real Instagram client using the "Instagram API with Instagram Login" (Graph)
 * endpoints. Requires an Instagram Professional (Business/Creator) account and a
 * Meta app with `instagram_business_basic` + `instagram_business_content_publish`
 * (approved via App Review). See docs/PLATFORM_SETUP.md.
 *
 * Content Publishing is two steps: create a media container, then publish it.
 * Instagram feed posts require media at a public URL — text-only is rejected.
 */
export class InstagramIntegration implements PlatformIntegration {
  readonly platform = 'instagram' as const;
  private readonly scopes = ['instagram_business_basic', 'instagram_business_content_publish'];

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  authorizeUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes.join(','),
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async connect(params?: ConnectParams): Promise<OAuthResult> {
    if (!params?.code || !params.redirectUri) throw new Error('Missing OAuth code/redirectUri');

    // 1. Exchange the code for a short-lived token (+ the IG user id).
    const short = await apiFetch<{ access_token: string; user_id: number }>(
      'instagram',
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        headers: FORM_HEADERS,
        body: formBody({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: params.redirectUri,
          code: params.code,
        }),
      },
    );

    // 2. Exchange for a long-lived (~60-day) token.
    const long = await apiFetch<{ access_token: string; expires_in: number }>(
      'instagram',
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: this.clientSecret,
        access_token: short.access_token,
      })}`,
    );

    // 3. Fetch the profile.
    const profile = await apiFetch<{ username: string; name?: string; followers_count?: number }>(
      'instagram',
      `https://graph.instagram.com/me?${new URLSearchParams({
        fields: 'user_id,username,name,followers_count',
        access_token: long.access_token,
      })}`,
    );

    const token: AccessToken = {
      platform: 'instagram',
      accessToken: long.access_token,
      expiresAt: Date.now() + long.expires_in * 1000,
      scopes: this.scopes,
      accountId: String(short.user_id),
    };
    const account: ConnectedAccount = {
      platform: 'instagram',
      status: 'connected',
      handle: `@${profile.username}`,
      displayName: profile.name ?? profile.username,
      followers: profile.followers_count,
      lastSyncedAt: new Date().toISOString(),
    };
    return { account, token };
  }

  async disconnect(): Promise<void> {
    // Instagram has no token-revocation endpoint; dropping the stored token (done
    // by the caller) is sufficient. Users can also revoke access in their settings.
  }

  async publish(post: Post, token: AccessToken, _opts?: PublishOptions): Promise<PublishResult> {
    const igUserId = token.accountId;
    if (!igUserId) throw new Error('Missing Instagram user id on token');
    const imageUrl = post.media.find((m) => m.type === 'image')?.url;
    if (!imageUrl) throw new Error('Instagram requires an image with a public URL to publish');

    // 1. Create a media container.
    const container = await apiFetch<{ id: string }>(
      'instagram',
      `https://graph.instagram.com/${igUserId}/media?${new URLSearchParams({
        image_url: imageUrl,
        caption: post.body,
        access_token: token.accessToken,
      })}`,
      { method: 'POST' },
    );

    // 2. Publish the container.
    const published = await apiFetch<{ id: string }>(
      'instagram',
      `https://graph.instagram.com/${igUserId}/media_publish?${new URLSearchParams({
        creation_id: container.id,
        access_token: token.accessToken,
      })}`,
      { method: 'POST' },
    );

    // 3. Resolve the permalink.
    const { permalink } = await apiFetch<{ permalink: string }>(
      'instagram',
      `https://graph.instagram.com/${published.id}?${new URLSearchParams({
        fields: 'permalink',
        access_token: token.accessToken,
      })}`,
    );

    return { remoteId: published.id, permalink };
  }
}
