import { Injectable } from '@nestjs/common';
import type {
  AccessToken,
  ConnectedAccount,
  Platform,
  Post,
  VaultChunk,
  VaultSearchResult,
} from '../../domain/types';
import type {
  AccountsRepository,
  PostsRepository,
  TokenStore,
  VectorStore,
} from '../repository.interfaces';
import { cosineSimilarity } from '../vector-math';

/**
 * In-memory implementations of every repository. Zero external dependencies, so
 * the server boots and is fully exercisable on a fresh checkout. State is lost
 * on restart — use the SQLite or Neon drivers for durability.
 */

@Injectable()
export class MemoryPostsRepository implements PostsRepository {
  private posts = new Map<string, Post>();

  async list(): Promise<Post[]> {
    return [...this.posts.values()].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }
  async findById(id: string): Promise<Post | null> {
    return this.posts.get(id) ?? null;
  }
  async findDue(nowIso: string): Promise<Post[]> {
    const now = new Date(nowIso).getTime();
    return [...this.posts.values()].filter(
      (p) => p.status === 'scheduled' && new Date(p.scheduledAt).getTime() <= now,
    );
  }
  async upsert(post: Post): Promise<Post> {
    this.posts.set(post.id, post);
    return post;
  }
  async delete(id: string): Promise<void> {
    this.posts.delete(id);
  }
}

@Injectable()
export class MemoryAccountsRepository implements AccountsRepository {
  private accounts = new Map<Platform, ConnectedAccount>();

  async list(): Promise<ConnectedAccount[]> {
    return [...this.accounts.values()];
  }
  async findByPlatform(platform: Platform): Promise<ConnectedAccount | null> {
    return this.accounts.get(platform) ?? null;
  }
  async upsert(account: ConnectedAccount): Promise<ConnectedAccount> {
    this.accounts.set(account.platform, account);
    return account;
  }
}

@Injectable()
export class MemoryTokenStore implements TokenStore {
  private tokens = new Map<Platform, AccessToken>();

  async get(platform: Platform): Promise<AccessToken | null> {
    return this.tokens.get(platform) ?? null;
  }
  async set(token: AccessToken): Promise<void> {
    this.tokens.set(token.platform, token);
  }
  async delete(platform: Platform): Promise<void> {
    this.tokens.delete(platform);
  }
}

@Injectable()
export class MemoryVectorStore implements VectorStore {
  private rows = new Map<string, { chunk: VaultChunk; embedding: number[] }>();

  async upsert(chunk: VaultChunk, embedding: number[]): Promise<void> {
    this.rows.set(chunk.id, { chunk, embedding });
  }
  async deleteBySource(source: string): Promise<void> {
    for (const [id, row] of this.rows) {
      if (row.chunk.source === source) this.rows.delete(id);
    }
  }
  async existingHashes(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const [id, row] of this.rows) map.set(id, row.chunk.hash);
    return map;
  }
  async search(embedding: number[], k: number): Promise<VaultSearchResult[]> {
    return [...this.rows.values()]
      .map(({ chunk, embedding: e }) => ({ ...chunk, score: cosineSimilarity(embedding, e) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
  async clear(): Promise<void> {
    this.rows.clear();
  }
}
