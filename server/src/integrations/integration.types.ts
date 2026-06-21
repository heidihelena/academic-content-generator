import type { AccessToken, ConnectedAccount, Platform, Post } from '../domain/types';

export interface OAuthResult {
  account: ConnectedAccount;
  token: AccessToken;
}

export interface PublishResult {
  remoteId: string;
  permalink: string;
}

/**
 * Per-platform integration contract. The app depends only on this interface, so
 * a mock can be swapped for a real Instagram/LinkedIn/Threads client with no
 * changes to services, the scheduler, or controllers.
 */
export interface PlatformIntegration {
  readonly platform: Platform;

  /**
   * Completes the OAuth handshake and returns the account + tokens.
   *
   * // --- REAL API INTEGRATION POINT ---------------------------------------
   * // Real: exchange the OAuth `code` for access/refresh tokens, then fetch the
   * // profile. Instagram Graph API / LinkedIn Marketing API / Threads API.
   * // The `code` would arrive at the OAuth callback controller and be passed in.
   * // ----------------------------------------------------------------------
   */
  connect(code?: string): Promise<OAuthResult>;

  disconnect(token: AccessToken): Promise<void>;

  /**
   * Publishes a post.
   *
   * // --- REAL API INTEGRATION POINT ---------------------------------------
   * // Real: upload media to the platform, then create the post; return the
   * // platform-native id + permalink. Refresh the token first if near expiry.
   * // ----------------------------------------------------------------------
   */
  publish(post: Post, token: AccessToken): Promise<PublishResult>;
}
