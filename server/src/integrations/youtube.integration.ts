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
 * Real YouTube client using Google OAuth 2.0 + the Data API v3 resumable
 * upload. "Publishing" a YouTube post uploads the post's attached **video
 * file** (from the media store) with the hook as the title and the body as
 * the description — the flow the Shorts planner feeds.
 *
 * Needs a Google Cloud OAuth client (Web application) with the **YouTube Data
 * API v3** enabled and the callback registered; supply its Client ID/Secret
 * via env (YOUTUBE_CLIENT_ID/SECRET) or in-app app credentials. Quota note:
 * one upload costs 1600 of the default 10 000 daily units (~6 uploads/day).
 * See docs/PLATFORM_SETUP.md.
 */

const OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

/** YouTube caps: 100-char titles, 5000-char descriptions. */
export function buildVideoMeta(post: Post): { title: string; description: string } {
  const firstLine = post.body.split('\n').find((l) => l.trim()) ?? 'Untitled';
  const title = (post.hook?.trim() || firstLine).slice(0, 100);
  return { title, description: post.body.slice(0, 5000) };
}

/** The attached video to upload, or a clear instruction when there is none. */
export function videoUrlOf(post: Post): string {
  const video = post.media.find((m) => m.type === 'video' && m.url);
  if (!video?.url) {
    throw new Error(
      'YouTube needs a video file — attach one to the post with "Upload file" before publishing.',
    );
  }
  return video.url;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export class YouTubeIntegration implements PlatformIntegration {
  readonly platform = 'youtube' as const;
  private readonly scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ];

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  authorizeUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
      // offline + consent → Google always issues a refresh token.
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${OAUTH_BASE}?${params.toString()}`;
  }

  async connect(params?: ConnectParams): Promise<OAuthResult> {
    if (!params?.code || !params.redirectUri) throw new Error('Missing OAuth code/redirectUri');

    const tok = await apiFetch<GoogleTokenResponse>('youtube', TOKEN_URL, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: params.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const channels = await apiFetch<{
      items?: Array<{
        id: string;
        snippet: { title: string; customUrl?: string };
        statistics?: { subscriberCount?: string };
      }>;
    }>('youtube', `${API}/channels?part=snippet,statistics&mine=true`, {
      headers: { authorization: `Bearer ${tok.access_token}` },
    });
    const channel = channels.items?.[0];
    if (!channel) {
      throw new Error(
        'No YouTube channel on this Google account — create one on youtube.com first.',
      );
    }

    const token: AccessToken = {
      platform: 'youtube',
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: Date.now() + tok.expires_in * 1000,
      scopes: this.scopes,
      accountId: channel.id,
    };
    const account: ConnectedAccount = {
      platform: 'youtube',
      status: 'connected',
      handle: channel.snippet.customUrl ?? channel.snippet.title,
      displayName: channel.snippet.title,
      followers: channel.statistics?.subscriberCount
        ? Number(channel.statistics.subscriberCount)
        : undefined,
      lastSyncedAt: new Date().toISOString(),
    };
    return { account, token };
  }

  async disconnect(): Promise<void> {
    // Dropping the stored token suffices; revoke in Google Account → Security
    // → Third-party access to fully invalidate.
  }

  async publish(post: Post, token: AccessToken, _opts?: PublishOptions): Promise<PublishResult> {
    let refreshedToken: AccessToken | undefined;
    let result: { id: string };
    try {
      result = await this.upload(post, token.accessToken);
    } catch (err) {
      // Google access tokens last ~1h — refresh once and retry. Google does
      // not rotate the refresh token, but the caller persists the new pair.
      if (token.refreshToken && /\b401\b/.test(String(err))) {
        const refreshed = await apiFetch<GoogleTokenResponse>('youtube', TOKEN_URL, {
          method: 'POST',
          headers: FORM_HEADERS,
          body: formBody({
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
        });
        refreshedToken = {
          ...token,
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + refreshed.expires_in * 1000,
        };
        result = await this.upload(post, refreshed.access_token);
      } else {
        throw err;
      }
    }
    return {
      remoteId: result.id,
      permalink: `https://www.youtube.com/watch?v=${result.id}`,
      refreshedToken,
    };
  }

  /** Resumable upload: initiate a session, then PUT the video bytes. */
  private async upload(post: Post, accessJwt: string): Promise<{ id: string }> {
    const meta = buildVideoMeta(post);
    const bytes = await this.fetchVideo(videoUrlOf(post));

    const init = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-upload-content-type': 'video/*',
        authorization: `Bearer ${accessJwt}`,
      },
      body: JSON.stringify({
        snippet: { title: meta.title, description: meta.description },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
      }),
    });
    if (!init.ok) {
      throw new Error(`youtube API ${init.status}: ${(await init.text()).slice(0, 300)}`);
    }
    const session = init.headers.get('location');
    if (!session) throw new Error('youtube API: resumable upload session missing Location header');

    return apiFetch<{ id: string }>('youtube', session, {
      method: 'PUT',
      headers: { 'content-type': 'video/*', authorization: `Bearer ${accessJwt}` },
      body: bytes,
    });
  }

  /** Resolve the post's video attachment to bytes (local uploads or S3 URL). */
  private async fetchVideo(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Could not read the attached video (${res.status}) — re-upload the file.`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
