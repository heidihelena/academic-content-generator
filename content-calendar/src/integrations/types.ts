import type { ConnectedAccount, Platform, Post } from '../types';

/**
 * Social platform integration contract.
 *
 * Each platform (Instagram, LinkedIn, Threads) implements `PlatformIntegration`.
 * The app talks only to this interface, so the mock implementations used in the
 * demo can be swapped for real API clients without touching the UI or store.
 */

export interface OAuthResult {
  account: ConnectedAccount;
  /** Opaque token bundle. In a real client this holds access/refresh tokens. */
  token: AccessToken;
}

export interface AccessToken {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  scopes: string[];
}

export interface PublishResult {
  /** Platform-native id of the created post. */
  remoteId: string;
  permalink: string;
}

export interface PlatformIntegration {
  readonly platform: Platform;

  /**
   * Begins (and, for the mock, completes) the OAuth handshake.
   *
   * // --- REAL API INTEGRATION POINT ---------------------------------------
   * // Real implementation would:
   * //   1. Redirect to the platform's OAuth consent URL (or open a popup).
   * //   2. Exchange the returned `code` for access/refresh tokens.
   * //   3. Fetch the account profile (handle, name, avatar, followers).
   * // e.g. Instagram Graph API, LinkedIn Marketing API, Threads API.
   * // ----------------------------------------------------------------------
   */
  connect(): Promise<OAuthResult>;

  /** Revokes tokens and marks the account disconnected. */
  disconnect(token: AccessToken): Promise<void>;

  /** Refreshes the profile/status for an already-connected account. */
  refreshStatus(token: AccessToken): Promise<ConnectedAccount>;

  /**
   * Publishes a post to the platform.
   *
   * // --- REAL API INTEGRATION POINT ---------------------------------------
   * // Real implementation would upload media, then create the post via the
   * // platform's publishing endpoint, returning the remote id + permalink.
   * // ----------------------------------------------------------------------
   */
  publish(post: Post, token: AccessToken): Promise<PublishResult>;
}
