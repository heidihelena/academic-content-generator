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
import { FileStoreService } from './file.service';

/**
 * File-backed repositories. Same semantics as the in-memory driver, but every
 * mutation is flushed to the JSON snapshot so state survives a restart — which
 * is what makes OAuth tokens and scheduled posts durable in the desktop app.
 */

@Injectable()
export class FilePostsRepository implements PostsRepository {
  constructor(private readonly store: FileStoreService) {}

  async list(): Promise<Post[]> {
    return [...this.store.posts.values()].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }
  async findById(id: string): Promise<Post | null> {
    return this.store.posts.get(id) ?? null;
  }
  async findDue(nowIso: string): Promise<Post[]> {
    const now = new Date(nowIso).getTime();
    return [...this.store.posts.values()].filter(
      (p) => p.status === 'scheduled' && new Date(p.scheduledAt).getTime() <= now,
    );
  }
  async upsert(post: Post): Promise<Post> {
    this.store.posts.set(post.id, post);
    this.store.save();
    return post;
  }
  async delete(id: string): Promise<void> {
    this.store.posts.delete(id);
    this.store.save();
  }
}

@Injectable()
export class FileAccountsRepository implements AccountsRepository {
  constructor(private readonly store: FileStoreService) {}

  async list(): Promise<ConnectedAccount[]> {
    return [...this.store.accounts.values()];
  }
  async findByPlatform(platform: Platform): Promise<ConnectedAccount | null> {
    return this.store.accounts.get(platform) ?? null;
  }
  async upsert(account: ConnectedAccount): Promise<ConnectedAccount> {
    this.store.accounts.set(account.platform, account);
    this.store.save();
    return account;
  }
}

@Injectable()
export class FileTokenStore implements TokenStore {
  constructor(private readonly store: FileStoreService) {}

  async get(platform: Platform): Promise<AccessToken | null> {
    return this.store.tokens.get(platform) ?? null;
  }
  async set(token: AccessToken): Promise<void> {
    this.store.tokens.set(token.platform, token);
    this.store.save();
  }
  async delete(platform: Platform): Promise<void> {
    this.store.tokens.delete(platform);
    this.store.save();
  }
}

@Injectable()
export class FileVectorStore implements VectorStore {
  constructor(private readonly store: FileStoreService) {}

  async upsert(chunk: VaultChunk, embedding: number[]): Promise<void> {
    this.store.vectors.set(chunk.id, { chunk, embedding });
    this.store.save();
  }
  async deleteBySource(source: string): Promise<void> {
    for (const [id, row] of this.store.vectors) {
      if (row.chunk.source === source) this.store.vectors.delete(id);
    }
    this.store.save();
  }
  async existingHashes(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const [id, row] of this.store.vectors) map.set(id, row.chunk.hash);
    return map;
  }
  async search(embedding: number[], k: number): Promise<VaultSearchResult[]> {
    return [...this.store.vectors.values()]
      .map(({ chunk, embedding: e }) => ({ ...chunk, score: cosineSimilarity(embedding, e) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
  async clear(): Promise<void> {
    this.store.vectors.clear();
    this.store.save();
  }
}
