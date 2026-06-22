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
 * Real Threads client using the Threads API (Meta). Requires a Threads
 * Professional account and a Meta app with `threads_basic` +
 * `threads_content_publish`. See docs/PLATFORM_SETUP.md.
 *
 * Publishing is two steps (create container → publish). Unlike Instagram,
 * Threads supports text-only posts; an image URL is used when present.
 */
export class ThreadsIntegration implements PlatformIntegration {
  readonly platform = 'threads' as const;
  private readonly scopes = ['threads_basic', 'threads_content_publish'];
  private readonly api = 'https://graph.threads.net/v1.0';

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
    return `https://threads.net/oauth/authorize?${params.toString()}`;
  }

  async connect(params?: ConnectParams): Promise<OAuthResult> {
    if (!params?.code || !params.redirectUri) throw new Error('Missing OAuth code/redirectUri');

    const short = await apiFetch<{ access_token: string; user_id: number }>(
      'threads',
      'https://graph.threads.net/oauth/access_token',
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

    const long = await apiFetch<{ access_token: string; expires_in: number }>(
      'threads',
      `https://graph.threads.net/access_token?${new URLSearchParams({
        grant_type: 'th_exchange_token',
        client_secret: this.clientSecret,
        access_token: short.access_token,
      })}`,
    );

    const profile = await apiFetch<{ id: string; username: string }>(
      'threads',
      `${this.api}/me?${new URLSearchParams({
        fields: 'id,username',
        access_token: long.access_token,
      })}`,
    );

    const token: AccessToken = {
      platform: 'threads',
      accessToken: long.access_token,
      expiresAt: Date.now() + long.expires_in * 1000,
      scopes: this.scopes,
      accountId: profile.id ?? String(short.user_id),
    };
    const account: ConnectedAccount = {
      platform: 'threads',
      status: 'connected',
      handle: `@${profile.username}`,
      displayName: profile.username,
      lastSyncedAt: new Date().toISOString(),
    };
    return { account, token };
  }

  async disconnect(): Promise<void> {
    // No revocation endpoint; dropping the stored token is sufficient.
  }

  async publish(post: Post, token: AccessToken, _opts?: PublishOptions): Promise<PublishResult> {
    const userId = token.accountId;
    if (!userId) throw new Error('Missing Threads user id on token');
    const imageUrl = post.media.find((m) => m.type === 'image')?.url;

    const createParams: Record<string, string> = imageUrl
      ? { media_type: 'IMAGE', image_url: imageUrl, text: post.body, access_token: token.accessToken }
      : { media_type: 'TEXT', text: post.body, access_token: token.accessToken };

    const container = await apiFetch<{ id: string }>(
      'threads',
      `${this.api}/${userId}/threads?${new URLSearchParams(createParams)}`,
      { method: 'POST' },
    );

    const published = await apiFetch<{ id: string }>(
      'threads',
      `${this.api}/${userId}/threads_publish?${new URLSearchParams({
        creation_id: container.id,
        access_token: token.accessToken,
      })}`,
      { method: 'POST' },
    );

    const { permalink } = await apiFetch<{ permalink: string }>(
      'threads',
      `${this.api}/${published.id}?${new URLSearchParams({
        fields: 'permalink',
        access_token: token.accessToken,
      })}`,
    );

    return { remoteId: published.id, permalink };
  }
}
