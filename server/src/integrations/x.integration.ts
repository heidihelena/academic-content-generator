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
 * Real X (Twitter) client using the v2 API with OAuth 2.0 Authorization Code +
 * PKCE (user context).
 *
 * **Requires a paid X developer app.** Posting to X needs an app on a paid
 * access tier (Basic or higher) with OAuth 2.0 enabled and the `tweet.write`
 * scope; the free tier is read-limited and won't post. Configure
 * `X_CLIENT_ID` / `X_CLIENT_SECRET`; without them API-mode OAuth will not start.
 * See docs/PLATFORM_SETUP.md.
 *
 * Publishing is a single call: POST /2/tweets with a Bearer user token.
 */
export class XIntegration implements PlatformIntegration {
  readonly platform = 'x' as const;
  private readonly scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
  private readonly api = 'https://api.twitter.com';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private basicAuth(): string {
    return `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
  }

  authorizeUrl(redirectUri: string, state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
      // PKCE is mandatory on X's OAuth2. The state service generates the verifier
      // and hands us the S256 challenge.
      code_challenge: codeChallenge ?? 'challenge',
      code_challenge_method: 'S256',
    });
    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  async connect(params?: ConnectParams): Promise<OAuthResult> {
    if (!params?.code || !params.redirectUri) throw new Error('Missing OAuth code/redirectUri');
    if (!params.codeVerifier) throw new Error('Missing PKCE code_verifier');

    const tok = await apiFetch<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }>('x', `${this.api}/2/oauth2/token`, {
      method: 'POST',
      headers: { ...FORM_HEADERS, authorization: this.basicAuth() },
      body: formBody({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
        client_id: this.clientId,
      }),
    });

    const me = await apiFetch<{ data: { id: string; name: string; username: string } }>(
      'x',
      `${this.api}/2/users/me`,
      { headers: { authorization: `Bearer ${tok.access_token}` } },
    );

    const token: AccessToken = {
      platform: 'x',
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: Date.now() + tok.expires_in * 1000,
      scopes: this.scopes,
      accountId: me.data.id,
    };
    const account: ConnectedAccount = {
      platform: 'x',
      status: 'connected',
      handle: `@${me.data.username}`,
      displayName: me.data.name,
      lastSyncedAt: new Date().toISOString(),
    };
    return { account, token };
  }

  async disconnect(token: AccessToken): Promise<void> {
    // Best-effort revoke; dropping the stored token is otherwise sufficient.
    try {
      await apiFetch('x', `${this.api}/2/oauth2/revoke`, {
        method: 'POST',
        headers: { ...FORM_HEADERS, authorization: this.basicAuth() },
        body: formBody({ token: token.accessToken, token_type_hint: 'access_token' }),
      });
    } catch {
      // ignore — the token is being discarded regardless
    }
  }

  async publish(post: Post, token: AccessToken, _opts?: PublishOptions): Promise<PublishResult> {
    const result = await apiFetch<{ data: { id: string } }>('x', `${this.api}/2/tweets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token.accessToken}` },
      body: JSON.stringify({ text: post.body }),
    });
    const id = result.data.id;
    return { remoteId: id, permalink: `https://x.com/i/web/status/${id}` };
  }
}
