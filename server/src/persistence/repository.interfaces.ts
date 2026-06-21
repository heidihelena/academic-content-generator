import type {
  AccessToken,
  ConnectedAccount,
  Platform,
  Post,
  VaultChunk,
  VaultSearchResult,
} from '../domain/types';

/**
 * Repository contracts. Services depend only on these interfaces, so the
 * backing store (memory / SQLite / Neon-pgvector) is swappable via config.
 *
 * Injection tokens are exported alongside each interface so Nest can resolve the
 * concrete implementation chosen at module-configuration time.
 */

export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');
export interface PostsRepository {
  list(): Promise<Post[]>;
  findById(id: string): Promise<Post | null>;
  /** Posts that are scheduled and due to publish at/under `nowIso`. */
  findDue(nowIso: string): Promise<Post[]>;
  upsert(post: Post): Promise<Post>;
  delete(id: string): Promise<void>;
}

export const ACCOUNTS_REPOSITORY = Symbol('ACCOUNTS_REPOSITORY');
export interface AccountsRepository {
  list(): Promise<ConnectedAccount[]>;
  findByPlatform(platform: Platform): Promise<ConnectedAccount | null>;
  upsert(account: ConnectedAccount): Promise<ConnectedAccount>;
}

export const TOKEN_STORE = Symbol('TOKEN_STORE');
export interface TokenStore {
  get(platform: Platform): Promise<AccessToken | null>;
  set(token: AccessToken): Promise<void>;
  delete(platform: Platform): Promise<void>;
}

export const VECTOR_STORE = Symbol('VECTOR_STORE');
export interface VectorStore {
  /** Insert or replace a chunk + its embedding. */
  upsert(chunk: VaultChunk, embedding: number[]): Promise<void>;
  /** Remove all chunks belonging to a source file (re-index path). */
  deleteBySource(source: string): Promise<void>;
  /** Hashes already stored, keyed by chunk id — lets ingestion skip unchanged chunks. */
  existingHashes(): Promise<Map<string, string>>;
  /** k-NN search by query embedding, returning the closest chunks. */
  search(embedding: number[], k: number): Promise<VaultSearchResult[]>;
  clear(): Promise<void>;
}
