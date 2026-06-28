import type { AccessToken, ConnectedAccount, Platform, Post } from '../domain/types';

export interface OAuthResult {
  account: ConnectedAccount;
  token: AccessToken;
}

export interface PublishResult {
  remoteId: string;
  permalink: string;
  /** Content hash (Bluesky CID), if the platform returns one. */
  remoteCid?: string;
}

/** Reference to an already-published post, used to chain a thread reply. */
export interface PostRef {
  uri: string;
  /** Bluesky requires the CID; Mastodon only needs the id (uri). */
  cid?: string;
}

/** Thread context passed to publish so a part replies to the right post. */
export interface ReplyRef {
  root: PostRef;
  parent: PostRef;
}

export interface PublishOptions {
  reply?: ReplyRef;
}

/** Parameters for completing the OAuth handshake. */
export interface ConnectParams {
  /** Authorization code from the provider redirect. */
  code?: string;
  /** The redirect URI used to start the flow — token exchange must match it. */
  redirectUri?: string;
  /** PKCE code_verifier, sent on token exchange for providers that require it (X). */
  codeVerifier?: string;
}

/**
 * Per-platform integration contract. The app depends only on this interface, so
 * a mock can be swapped for a real Instagram/LinkedIn/Threads client with no
 * changes to services, the scheduler, or controllers.
 */
export interface PlatformIntegration {
  readonly platform: Platform;

  /**
   * Builds the OAuth consent URL the user is sent to. `state` is an opaque,
   * single-use value the callback verifies (CSRF protection + platform lookup).
   *
   * // --- REAL API INTEGRATION POINT ---------------------------------------
   * // Real: return the platform's authorize endpoint with client_id, scope,
   * // redirect_uri and state, e.g.
   * //   https://www.facebook.com/v19.0/dialog/oauth?client_id=...&state=...
   * //   https://www.linkedin.com/oauth/v2/authorization?...&state=...
   * // ----------------------------------------------------------------------
   */
  authorizeUrl(redirectUri: string, state: string, codeChallenge?: string): string;

  /**
   * Completes the OAuth handshake and returns the account + tokens.
   *
   * // --- REAL API INTEGRATION POINT ---------------------------------------
   * // Real: exchange the OAuth `code` for access/refresh tokens, then fetch the
   * // profile. Instagram Graph API / LinkedIn Marketing API / Threads API.
   * // The `code` + `redirectUri` arrive at the OAuth callback controller.
   * // ----------------------------------------------------------------------
   */
  connect(params?: ConnectParams): Promise<OAuthResult>;

  disconnect(token: AccessToken): Promise<void>;

  /**
   * Publishes a post.
   *
   * // --- REAL API INTEGRATION POINT ---------------------------------------
   * // Real: upload media to the platform, then create the post; return the
   * // platform-native id + permalink. Refresh the token first if near expiry.
   * // ----------------------------------------------------------------------
   */
  publish(post: Post, token: AccessToken, opts?: PublishOptions): Promise<PublishResult>;
}
