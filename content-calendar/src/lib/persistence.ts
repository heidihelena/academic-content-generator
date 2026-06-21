import type { ConnectedAccount, Post } from '../types';

/**
 * Mock persistence layer.
 *
 * Today this serializes to localStorage so the demo feels like a real product
 * across reloads. The `PersistenceAdapter` interface is the seam where a real
 * backend would plug in:
 *
 *   // --- REAL API INTEGRATION POINT ---------------------------------------
 *   // Replace LocalStoragePersistence with an adapter that calls your REST
 *   // or GraphQL backend, e.g.:
 *   //   class ApiPersistence implements PersistenceAdapter {
 *   //     async loadPosts() { return fetch('/api/posts').then(r => r.json()); }
 *   //     async savePosts(posts) { await fetch('/api/posts', { method:'PUT', ... }); }
 *   //   }
 *   // The store (useStore) depends only on this interface, so swapping the
 *   // implementation requires no UI changes.
 *   // ----------------------------------------------------------------------
 */

export interface PersistedState {
  posts: Post[];
  accounts: ConnectedAccount[];
}

export interface PersistenceAdapter {
  load(): PersistedState | null;
  save(state: PersistedState): void;
  clear(): void;
}

const STORAGE_KEY = 'vahtian.content-calendar.v1';

export class LocalStoragePersistence implements PersistenceAdapter {
  constructor(private key: string = STORAGE_KEY) {}

  load(): PersistedState | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedState;
      // Basic shape validation — guards against stale/corrupt payloads.
      if (!parsed || !Array.isArray(parsed.posts) || !Array.isArray(parsed.accounts)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  save(state: PersistedState): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // Quota or serialization errors are non-fatal for a mock layer.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* no-op */
    }
  }
}

/** In-memory adapter, primarily for tests and SSR-safe defaults. */
export class MemoryPersistence implements PersistenceAdapter {
  private state: PersistedState | null = null;
  load() {
    return this.state;
  }
  save(state: PersistedState) {
    this.state = state;
  }
  clear() {
    this.state = null;
  }
}
