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
import { SqliteService } from './sqlite.service';

/** SQLite-backed repositories. Each row stores the domain object as JSON plus
 *  the few columns we query on (so the schema stays simple but indexable). */

@Injectable()
export class SqlitePostsRepository implements PostsRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async list(): Promise<Post[]> {
    const rows = this.sqlite.db
      .prepare('SELECT data FROM posts ORDER BY scheduled_at ASC')
      .all();
    return rows.map((r: any) => JSON.parse(r.data) as Post);
  }
  async findById(id: string): Promise<Post | null> {
    const row = this.sqlite.db.prepare('SELECT data FROM posts WHERE id = ?').get(id);
    return row ? (JSON.parse(row.data) as Post) : null;
  }
  async findDue(nowIso: string): Promise<Post[]> {
    const rows = this.sqlite.db
      .prepare("SELECT data FROM posts WHERE status = 'scheduled' AND scheduled_at <= ?")
      .all(nowIso);
    return rows.map((r: any) => JSON.parse(r.data) as Post);
  }
  async upsert(post: Post): Promise<Post> {
    this.sqlite.db
      .prepare(
        `INSERT INTO posts (id, data, scheduled_at, status) VALUES (@id, @data, @scheduledAt, @status)
         ON CONFLICT(id) DO UPDATE SET data=@data, scheduled_at=@scheduledAt, status=@status`,
      )
      .run({ id: post.id, data: JSON.stringify(post), scheduledAt: post.scheduledAt, status: post.status });
    return post;
  }
  async delete(id: string): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  }
}

@Injectable()
export class SqliteAccountsRepository implements AccountsRepository {
  constructor(private readonly sqlite: SqliteService) {}

  async list(): Promise<ConnectedAccount[]> {
    return this.sqlite.db
      .prepare('SELECT data FROM accounts')
      .all()
      .map((r: any) => JSON.parse(r.data) as ConnectedAccount);
  }
  async findByPlatform(platform: Platform): Promise<ConnectedAccount | null> {
    const row = this.sqlite.db.prepare('SELECT data FROM accounts WHERE platform = ?').get(platform);
    return row ? (JSON.parse(row.data) as ConnectedAccount) : null;
  }
  async upsert(account: ConnectedAccount): Promise<ConnectedAccount> {
    this.sqlite.db
      .prepare(
        `INSERT INTO accounts (platform, data) VALUES (@platform, @data)
         ON CONFLICT(platform) DO UPDATE SET data=@data`,
      )
      .run({ platform: account.platform, data: JSON.stringify(account) });
    return account;
  }
}

@Injectable()
export class SqliteTokenStore implements TokenStore {
  constructor(private readonly sqlite: SqliteService) {}

  async get(platform: Platform): Promise<AccessToken | null> {
    const row = this.sqlite.db.prepare('SELECT data FROM tokens WHERE platform = ?').get(platform);
    return row ? (JSON.parse(row.data) as AccessToken) : null;
  }
  async set(token: AccessToken): Promise<void> {
    this.sqlite.db
      .prepare(
        `INSERT INTO tokens (platform, data) VALUES (@platform, @data)
         ON CONFLICT(platform) DO UPDATE SET data=@data`,
      )
      .run({ platform: token.platform, data: JSON.stringify(token) });
  }
  async delete(platform: Platform): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM tokens WHERE platform = ?').run(platform);
  }
}

@Injectable()
export class SqliteVectorStore implements VectorStore {
  constructor(private readonly sqlite: SqliteService) {}

  async upsert(chunk: VaultChunk, embedding: number[]): Promise<void> {
    this.sqlite.db
      .prepare(
        `INSERT INTO vault_chunks (id, source, title, content, hash, embedding)
         VALUES (@id, @source, @title, @content, @hash, @embedding)
         ON CONFLICT(id) DO UPDATE SET
           source=@source, title=@title, content=@content, hash=@hash, embedding=@embedding`,
      )
      .run({
        id: chunk.id,
        source: chunk.source,
        title: chunk.title ?? null,
        content: chunk.content,
        hash: chunk.hash,
        embedding: JSON.stringify(embedding),
      });
  }
  async deleteBySource(source: string): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM vault_chunks WHERE source = ?').run(source);
  }
  async existingHashes(): Promise<Map<string, string>> {
    const rows = this.sqlite.db.prepare('SELECT id, hash FROM vault_chunks').all();
    return new Map(rows.map((r: any) => [r.id, r.hash]));
  }
  async search(embedding: number[], k: number): Promise<VaultSearchResult[]> {
    // JS cosine over stored embeddings. For large vaults, switch to a sqlite-vec
    // vec0 virtual table and an `ORDER BY distance` query — same interface.
    const rows = this.sqlite.db
      .prepare('SELECT id, source, title, content, hash, embedding FROM vault_chunks')
      .all();
    return rows
      .map((r: any) => ({
        id: r.id,
        source: r.source,
        title: r.title ?? undefined,
        content: r.content,
        hash: r.hash,
        score: cosineSimilarity(embedding, JSON.parse(r.embedding) as number[]),
      }))
      .sort((a: VaultSearchResult, b: VaultSearchResult) => b.score - a.score)
      .slice(0, k);
  }
  async clear(): Promise<void> {
    this.sqlite.db.prepare('DELETE FROM vault_chunks').run();
  }
}
