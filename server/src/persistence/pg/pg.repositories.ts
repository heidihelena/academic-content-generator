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
import { PgService } from './pg.service';

/** Postgres-backed repositories. Operational rows store the domain object as
 *  JSONB; the vector store uses a native pgvector column with cosine distance. */

@Injectable()
export class PgPostsRepository implements PostsRepository {
  constructor(private readonly pg: PgService) {}

  async list(): Promise<Post[]> {
    const { rows } = await this.pg.query('SELECT data FROM posts ORDER BY scheduled_at ASC');
    return rows.map((r: any) => r.data as Post);
  }
  async findById(id: string): Promise<Post | null> {
    const { rows } = await this.pg.query('SELECT data FROM posts WHERE id = $1', [id]);
    return rows[0] ? (rows[0].data as Post) : null;
  }
  async findDue(nowIso: string): Promise<Post[]> {
    const { rows } = await this.pg.query(
      "SELECT data FROM posts WHERE status = 'scheduled' AND scheduled_at <= $1",
      [nowIso],
    );
    return rows.map((r: any) => r.data as Post);
  }
  async upsert(post: Post): Promise<Post> {
    await this.pg.query(
      `INSERT INTO posts (id, data, scheduled_at, status) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET data = $2, scheduled_at = $3, status = $4`,
      [post.id, post, post.scheduledAt, post.status],
    );
    return post;
  }
  async delete(id: string): Promise<void> {
    await this.pg.query('DELETE FROM posts WHERE id = $1', [id]);
  }
}

@Injectable()
export class PgAccountsRepository implements AccountsRepository {
  constructor(private readonly pg: PgService) {}

  async list(): Promise<ConnectedAccount[]> {
    const { rows } = await this.pg.query('SELECT data FROM accounts');
    return rows.map((r: any) => r.data as ConnectedAccount);
  }
  async findByPlatform(platform: Platform): Promise<ConnectedAccount | null> {
    const { rows } = await this.pg.query('SELECT data FROM accounts WHERE platform = $1', [platform]);
    return rows[0] ? (rows[0].data as ConnectedAccount) : null;
  }
  async upsert(account: ConnectedAccount): Promise<ConnectedAccount> {
    await this.pg.query(
      `INSERT INTO accounts (platform, data) VALUES ($1, $2)
       ON CONFLICT (platform) DO UPDATE SET data = $2`,
      [account.platform, account],
    );
    return account;
  }
}

@Injectable()
export class PgTokenStore implements TokenStore {
  constructor(private readonly pg: PgService) {}

  async get(platform: Platform): Promise<AccessToken | null> {
    const { rows } = await this.pg.query('SELECT data FROM tokens WHERE platform = $1', [platform]);
    return rows[0] ? (rows[0].data as AccessToken) : null;
  }
  async set(token: AccessToken): Promise<void> {
    await this.pg.query(
      `INSERT INTO tokens (platform, data) VALUES ($1, $2)
       ON CONFLICT (platform) DO UPDATE SET data = $2`,
      [token.platform, token],
    );
  }
  async delete(platform: Platform): Promise<void> {
    await this.pg.query('DELETE FROM tokens WHERE platform = $1', [platform]);
  }
}

@Injectable()
export class PgVectorStore implements VectorStore {
  constructor(private readonly pg: PgService) {}

  /** pgvector accepts a bracketed string literal: '[0.1,0.2,...]'. */
  private toVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async upsert(chunk: VaultChunk, embedding: number[]): Promise<void> {
    await this.pg.query(
      `INSERT INTO vault_chunks (id, source, title, content, hash, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         source = $2, title = $3, content = $4, hash = $5, embedding = $6`,
      [chunk.id, chunk.source, chunk.title ?? null, chunk.content, chunk.hash, this.toVector(embedding)],
    );
  }
  async deleteBySource(source: string): Promise<void> {
    await this.pg.query('DELETE FROM vault_chunks WHERE source = $1', [source]);
  }
  async existingHashes(): Promise<Map<string, string>> {
    const { rows } = await this.pg.query('SELECT id, hash FROM vault_chunks');
    return new Map(rows.map((r: any) => [r.id, r.hash]));
  }
  async search(embedding: number[], k: number): Promise<VaultSearchResult[]> {
    // `<=>` is pgvector's cosine distance; similarity = 1 - distance.
    const { rows } = await this.pg.query(
      `SELECT id, source, title, content, hash, 1 - (embedding <=> $1) AS score
       FROM vault_chunks ORDER BY embedding <=> $1 LIMIT $2`,
      [this.toVector(embedding), k],
    );
    return rows.map((r: any) => ({
      id: r.id,
      source: r.source,
      title: r.title ?? undefined,
      content: r.content,
      hash: r.hash,
      score: Number(r.score),
    }));
  }
  async clear(): Promise<void> {
    await this.pg.query('DELETE FROM vault_chunks');
  }
}
