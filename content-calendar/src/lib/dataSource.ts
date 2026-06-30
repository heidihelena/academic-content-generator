import type { ConnectedAccount, MediaAttachment, Platform, Post } from '../types';
import { LocalStoragePersistence, type PersistenceAdapter } from './persistence';
import { createSampleAccounts, createSamplePosts } from '../data/sampleData';
import { getIntegration } from '../integrations/registry';
import type { AccessToken } from '../integrations/types';
import { createId } from './id';
import { ApiClient } from './api';

/**
 * The data plane the store talks to. Two implementations:
 *
 *  - `LocalDataSource` — sample data + localStorage + mock integrations. Used in
 *    tests and when no backend is configured. Its synchronous `loadSync()` lets
 *    the store hydrate immediately offline.
 *  - `ApiDataSource` — the NestJS backend (REST). Selected when `VITE_API_URL`
 *    is set.
 *
 * Switching backends is a config change, not a UI change.
 */
/** Credentials a user enters in-app for the token/app-password platforms. */
export interface PlatformCredentials {
  service?: string;
  identifier?: string;
  appPassword?: string;
  instance?: string;
  accessToken?: string;
}

export interface DataSource {
  /** Synchronous hydrate for offline/local mode. Absent on remote sources. */
  loadSync?(): { posts: Post[]; accounts: ConnectedAccount[] };
  loadPosts(): Promise<Post[]>;
  loadAccounts(): Promise<ConnectedAccount[]>;
  /** Create a post. The store supplies a client id used optimistically. */
  createPost(post: Post): Promise<Post>;
  updatePost(id: string, patch: Partial<Post>): Promise<Post>;
  deletePost(id: string): Promise<void>;
  connectAccount(platform: Platform): Promise<ConnectedAccount>;
  /** Verify user-supplied credentials and connect (Bluesky / Mastodon). */
  verifyAccount(platform: Platform, creds: PlatformCredentials): Promise<ConnectedAccount>;
  disconnectAccount(platform: Platform): Promise<ConnectedAccount>;
  /** Publish a post immediately to its platform; resolves to the updated post
   *  (`published` with a permalink, or `failed` with a reason). */
  publishPost(id: string): Promise<Post>;
  /** Upload a media file and return an attachment with a usable URL. */
  uploadMedia(file: File): Promise<MediaAttachment>;
}

/** Local, dependency-free data source backed by a PersistenceAdapter. */
export class LocalDataSource implements DataSource {
  private posts: Post[] = [];
  private accounts: ConnectedAccount[] = [];
  private hydrated = false;
  private readonly tokens = new Map<Platform, AccessToken>();

  constructor(private readonly persistence: PersistenceAdapter = new LocalStoragePersistence()) {}

  private ensure(): void {
    if (this.hydrated) return;
    const saved = this.persistence.load();
    if (saved) {
      this.posts = saved.posts;
      this.accounts = saved.accounts;
    } else {
      this.posts = createSamplePosts();
      this.accounts = createSampleAccounts();
      this.save();
    }
    this.hydrated = true;
  }

  private save(): void {
    this.persistence.save({ posts: this.posts, accounts: this.accounts });
  }

  loadSync(): { posts: Post[]; accounts: ConnectedAccount[] } {
    this.ensure();
    return { posts: this.posts, accounts: this.accounts };
  }

  async loadPosts(): Promise<Post[]> {
    this.ensure();
    return this.posts;
  }
  async loadAccounts(): Promise<ConnectedAccount[]> {
    this.ensure();
    return this.accounts;
  }
  async createPost(post: Post): Promise<Post> {
    this.ensure();
    this.posts = [...this.posts, post];
    this.save();
    return post;
  }
  async updatePost(id: string, patch: Partial<Post>): Promise<Post> {
    this.ensure();
    let updated: Post | undefined;
    this.posts = this.posts.map((p) => (p.id === id ? (updated = { ...p, ...patch }) : p));
    this.save();
    return updated ?? (patch as Post);
  }
  async deletePost(id: string): Promise<void> {
    this.ensure();
    this.posts = this.posts.filter((p) => p.id !== id);
    this.save();
  }
  async connectAccount(platform: Platform): Promise<ConnectedAccount> {
    const { account, token } = await getIntegration(platform).connect();
    this.tokens.set(platform, token);
    this.accounts = this.accounts.map((a) => (a.platform === platform ? account : a));
    this.save();
    return account;
  }
  async verifyAccount(platform: Platform): Promise<ConnectedAccount> {
    // Offline/mock: the mock integration ignores credentials and "succeeds",
    // so the verify-and-connect flow is exercisable without a backend. Real
    // credential checking happens in API mode against /accounts/:platform/verify.
    return this.connectAccount(platform);
  }
  async disconnectAccount(platform: Platform): Promise<ConnectedAccount> {
    const token = this.tokens.get(platform);
    if (token) await getIntegration(platform).disconnect(token);
    this.tokens.delete(platform);
    const account: ConnectedAccount = { platform, status: 'disconnected' };
    this.accounts = this.accounts.map((a) => (a.platform === platform ? account : a));
    this.save();
    return account;
  }
  async publishPost(id: string): Promise<Post> {
    this.ensure();
    const post = this.posts.find((p) => p.id === id);
    if (!post) throw new Error('Post not found');
    const now = new Date().toISOString();
    // Mirror the backend's guard: publishing needs a connected account. Offline
    // we can't reach a real platform, so a "connected" (mock) account yields a
    // demo permalink; otherwise the post fails with the same reason the API gives.
    const connected = this.accounts.find((a) => a.platform === post.platform)?.status === 'connected';
    const updated: Post = connected
      ? {
          ...post,
          status: 'published',
          publishedAt: now,
          remoteId: createId('remote'),
          permalink: `https://example.local/${post.platform}/${post.id}`,
          statusDetail: undefined,
          updatedAt: now,
        }
      : { ...post, status: 'failed', statusDetail: `No connected ${post.platform} account`, updatedAt: now };
    this.posts = this.posts.map((p) => (p.id === id ? updated : p));
    this.save();
    return updated;
  }
  async uploadMedia(file: File): Promise<MediaAttachment> {
    // Offline: use an object URL for preview. Note this URL is not publicly
    // reachable, so it can't be used for real platform publishing — that needs
    // the API/S3 path. Good enough for the local demo.
    return {
      id: createId('media'),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      label: file.name,
      url: URL.createObjectURL(file),
    };
  }
}

/** Remote data source backed by the NestJS API. */
export class ApiDataSource implements DataSource {
  constructor(
    private readonly api: ApiClient,
    private readonly redirect: (url: string) => void = (url) => window.location.assign(url),
  ) {}

  loadPosts(): Promise<Post[]> {
    return this.api.get<Post[]>('/posts');
  }
  loadAccounts(): Promise<ConnectedAccount[]> {
    return this.api.get<ConnectedAccount[]>('/accounts');
  }
  createPost(post: Post): Promise<Post> {
    // The backend honors a client-supplied id so optimistic ids stay stable.
    return this.api.post<Post>('/posts', {
      id: post.id,
      platform: post.platform,
      body: post.body,
      scheduledAt: post.scheduledAt,
      status: post.status,
      media: post.media,
    });
  }
  updatePost(id: string, patch: Partial<Post>): Promise<Post> {
    return this.api.patch<Post>(`/posts/${id}`, patch);
  }
  deletePost(id: string): Promise<void> {
    return this.api.delete<void>(`/posts/${id}`);
  }
  async connectAccount(platform: Platform): Promise<ConnectedAccount> {
    const { authorizeUrl } = await this.api.authorizeAccount(platform);
    this.redirect(authorizeUrl);
    return {
      platform,
      status: 'disconnected',
      statusDetail: 'Redirecting to provider authorization...',
    };
  }
  verifyAccount(platform: Platform, creds: PlatformCredentials): Promise<ConnectedAccount> {
    return this.api.post<ConnectedAccount>(`/accounts/${platform}/verify`, creds);
  }
  disconnectAccount(platform: Platform): Promise<ConnectedAccount> {
    return this.api.post<ConnectedAccount>(`/accounts/${platform}/disconnect`);
  }
  publishPost(id: string): Promise<Post> {
    // The backend posts via the platform integration and returns the updated
    // post (published + permalink, or failed + statusDetail).
    return this.api.post<Post>(`/posts/${id}/publish`);
  }
  uploadMedia(file: File): Promise<MediaAttachment> {
    return this.api.upload<MediaAttachment>('/media/upload', file);
  }
}

/** Builds the default data source from the environment. */
export function createDataSource(): DataSource {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiDataSource(new ApiClient(baseUrl)) : new LocalDataSource();
}
