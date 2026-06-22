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
 * Real Bluesky client using the AT Protocol XRPC endpoints.
 *
 * Bluesky doesn't use OAuth client credentials — it authenticates with an
 * account identifier + an **app password** (Settings → App Passwords), supplied
 * via BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD. We createSession to get JWTs,
 * then createRecord an `app.bsky.feed.post`. Links are made clickable via
 * richtext facets with UTF-8 byte offsets. See docs/PLATFORM_SETUP.md.
 */

const JSON_HEADERS = { 'content-type': 'application/json' };

/** A richtext facet marking a byte range as a link. */
export interface Facet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: 'app.bsky.richtext.facet#link'; uri: string }>;
}

/** UTF-8 byte length of a string (AT Protocol facets index bytes, not chars). */
function byteLength(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}

/**
 * Detect URLs in `text` and return link facets with correct UTF-8 byte offsets.
 * Trailing punctuation is trimmed from the matched URL so links stay clean.
 */
export function detectFacets(text: string): Facet[] {
  const facets: Facet[] = [];
  const re = /https?:\/\/[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let url = m[0];
    // Drop trailing punctuation that isn't part of the link.
    const trimmed = url.replace(/[.,;:!?)\]}'"]+$/, '');
    url = trimmed;
    const start = m.index;
    facets.push({
      index: {
        byteStart: byteLength(text.slice(0, start)),
        byteEnd: byteLength(text.slice(0, start) + url),
      },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
    });
  }
  return facets;
}

/** A Bluesky reply ref: strong refs to the thread root + immediate parent. */
export type BskyReply = { root: { uri: string; cid: string }; parent: { uri: string; cid: string } };

/**
 * Build the `app.bsky.feed.post` record body. Omits facets when there are none,
 * and includes a `reply` ref when chaining a thread.
 */
export function buildFeedPostRecord(
  text: string,
  createdAt = new Date().toISOString(),
  reply?: BskyReply,
) {
  const facets = detectFacets(text);
  return {
    $type: 'app.bsky.feed.post' as const,
    text,
    createdAt,
    ...(facets.length > 0 ? { facets } : {}),
    ...(reply ? { reply } : {}),
  };
}

/** Convert a generic ReplyRef into a Bluesky reply, only if both CIDs exist. */
export function toBskyReply(reply: ReplyRef | undefined): BskyReply | undefined {
  if (!reply?.root.cid || !reply.parent.cid) return undefined;
  return {
    root: { uri: reply.root.uri, cid: reply.root.cid },
    parent: { uri: reply.parent.uri, cid: reply.parent.cid },
  };
}

/** Turn an at:// post URI into a bsky.app web permalink. */
export function blueskyPermalink(did: string, uri: string): string {
  const rkey = uri.split('/').pop() ?? '';
  return `https://bsky.app/profile/${did}/post/${rkey}`;
}

interface SessionResponse {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

export class BlueskyIntegration implements PlatformIntegration {
  readonly platform = 'bluesky' as const;

  constructor(
    private readonly service: string,
    private readonly identifier: string,
    private readonly appPassword: string,
  ) {}

  private url(method: string): string {
    return `${this.service.replace(/\/$/, '')}/xrpc/${method}`;
  }

  authorizeUrl(redirectUri: string, state: string): string {
    // Bluesky has no hosted consent screen for app-password auth: bounce straight
    // back to our callback, which calls connect() using the configured app
    // password. (A real OAuth client would return the provider's consent URL.)
    const params = new URLSearchParams({ code: 'bluesky', state });
    return `${redirectUri}?${params.toString()}`;
  }

  async connect(_params?: ConnectParams): Promise<OAuthResult> {
    const session = await apiFetch<SessionResponse>(
      'bluesky',
      this.url('com.atproto.server.createSession'),
      {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ identifier: this.identifier, password: this.appPassword }),
      },
    );

    let followers: number | undefined;
    let displayName = session.handle;
    try {
      const profile = await apiFetch<{ displayName?: string; followersCount?: number }>(
        'bluesky',
        `${this.url('app.bsky.actor.getProfile')}?actor=${encodeURIComponent(session.did)}`,
        { headers: { authorization: `Bearer ${session.accessJwt}` } },
      );
      followers = profile.followersCount;
      if (profile.displayName) displayName = profile.displayName;
    } catch {
      // Profile is best-effort; a session is enough to publish.
    }

    const token: AccessToken = {
      platform: 'bluesky',
      accessToken: session.accessJwt,
      refreshToken: session.refreshJwt,
      // Access JWTs are short-lived (~2h); store a conservative expiry.
      expiresAt: Date.now() + 1000 * 60 * 90,
      scopes: [],
      accountId: session.did,
    };
    const account: ConnectedAccount = {
      platform: 'bluesky',
      status: 'connected',
      handle: `@${session.handle}`,
      displayName,
      followers,
      lastSyncedAt: new Date().toISOString(),
    };
    return { account, token };
  }

  async disconnect(): Promise<void> {
    // App-password sessions are dropped client-side; revoke the app password in
    // Bluesky settings to fully invalidate. No server endpoint needed here.
  }

  async publish(post: Post, token: AccessToken, opts?: PublishOptions): Promise<PublishResult> {
    const did = token.accountId;
    if (!did) throw new Error('Missing Bluesky DID on token');
    // Bluesky caps posts at 300 graphemes; the composer should already split.
    if ([...post.body].length > 300) {
      throw new Error('Bluesky posts are limited to 300 characters — split into a thread first');
    }

    const record = buildFeedPostRecord(post.body, new Date().toISOString(), toBskyReply(opts?.reply));
    const create = async (accessJwt: string) =>
      apiFetch<{ uri: string; cid: string }>('bluesky', this.url('com.atproto.repo.createRecord'), {
        method: 'POST',
        headers: { ...JSON_HEADERS, authorization: `Bearer ${accessJwt}` },
        body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record }),
      });

    let result: { uri: string; cid: string };
    try {
      result = await create(token.accessToken);
    } catch (err) {
      // The access JWT may have expired — refresh once and retry.
      if (token.refreshToken && /\b401\b/.test(String(err))) {
        const refreshed = await apiFetch<SessionResponse>(
          'bluesky',
          this.url('com.atproto.server.refreshSession'),
          { method: 'POST', headers: { authorization: `Bearer ${token.refreshToken}` } },
        );
        result = await create(refreshed.accessJwt);
      } else {
        throw err;
      }
    }

    return { remoteId: result.uri, remoteCid: result.cid, permalink: blueskyPermalink(did, result.uri) };
  }
}
