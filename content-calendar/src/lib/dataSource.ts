import type { ConnectedAccount, Platform, Post } from '../types';
import { LocalStoragePersistence, type PersistenceAdapter } from './persistence';
import { createSampleAccounts, createSamplePosts } from '../data/sampleData';
import { getIntegration } from '../integrations/registry';
import type { AccessToken } from '../integrations/types';
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
  disconnectAccount(platform: Platform): Promise<ConnectedAccount>;
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
  async disconnectAccount(platform: Platform): Promise<ConnectedAccount> {
    const token = this.tokens.get(platform);
    if (token) await getIntegration(platform).disconnect(token);
    this.tokens.delete(platform);
    const account: ConnectedAccount = { platform, status: 'disconnected' };
    this.accounts = this.accounts.map((a) => (a.platform === platform ? account : a));
    this.save();
    return account;
  }
}

/** Remote data source backed by the NestJS API. */
export class ApiDataSource implements DataSource {
  constructor(private readonly api: ApiClient) {}

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
  connectAccount(platform: Platform): Promise<ConnectedAccount> {
    // Mock backend connects directly. For real OAuth, redirect the browser to
    // `${VITE_API_URL}/accounts/oauth/${platform}/authorize` instead.
    return this.api.post<ConnectedAccount>(`/accounts/${platform}/connect`);
  }
  disconnectAccount(platform: Platform): Promise<ConnectedAccount> {
    return this.api.post<ConnectedAccount>(`/accounts/${platform}/disconnect`);
  }
}

/** Builds the default data source from the environment. */
export function createDataSource(): DataSource {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiDataSource(new ApiClient(baseUrl)) : new LocalDataSource();
}
