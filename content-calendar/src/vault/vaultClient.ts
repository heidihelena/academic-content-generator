import { ApiClient } from '../lib/api';

/**
 * Vault client — semantic search over the user's Obsidian (markdown) vault, the
 * local-first *input* side of forskai (e.g. a vault synced via iCloud). Two
 * implementations, selected by config (never by UI):
 *
 *  - `LocalVaultClient` — a dependency-free lexical search over seeded sample
 *    notes. Works offline and in tests; there is no real vault to embed, so
 *    `ingest()` reports zero (mirroring the server when the vault path is empty).
 *  - `ApiVaultClient` — the backend's `/vault/search` (vector search) and
 *    `/vault/ingest` (re-index). Selected when `VITE_API_URL` is set.
 *
 * Switching backends is a config change, not a UI change.
 */

/** One vault search hit — mirrors the server's `VaultSearchResult`. */
export interface VaultHit {
  id: string;
  /** Source file path relative to the vault root. */
  source: string;
  /** Heading/section title, if the chunk has one. */
  title?: string;
  content: string;
  /** Similarity score in [0, 1] (lexical overlap locally, cosine via the API). */
  score: number;
}

/** Outcome of a (re)ingestion — mirrors the server's `IngestReport`. */
export interface VaultIngestReport {
  files: number;
  chunks: number;
  embedded: number;
  skipped: number;
}

export interface VaultClient {
  search(query: string, k?: number): Promise<VaultHit[]>;
  ingest(): Promise<VaultIngestReport>;
}

/** A seed note for the local client — a hit without its (computed) score. */
type VaultChunkSeed = Omit<VaultHit, 'score'>;

export const SAMPLE_VAULT: VaultChunkSeed[] = [
  {
    id: 'vault_sample_heat',
    source: 'urban-heat/notes.md',
    title: 'Urban heat & tree canopy',
    content:
      'Street trees lower surface temperatures by shading pavement; canopy cover ' +
      'correlates with cooler neighborhoods and fewer heat-related ER visits.',
  },
  {
    id: 'vault_sample_sleep',
    source: 'neuro/sleep.md',
    title: 'Sleep and memory consolidation',
    content:
      'Slow-wave sleep supports hippocampal memory consolidation; fragmented ' +
      'sleep is associated with weaker next-day recall in observational studies.',
  },
  {
    id: 'vault_sample_methods',
    source: 'methods/causal-language.md',
    title: 'Causal language in abstracts',
    content:
      'Observational findings report associations, not causation. Prefer ' +
      '"is associated with" over "causes" unless the design supports it.',
  },
];

/** Local, dependency-free lexical search over seeded notes. */
export class LocalVaultClient implements VaultClient {
  constructor(private readonly seed: VaultChunkSeed[] = SAMPLE_VAULT) {}

  async search(query: string, k = 5): Promise<VaultHit[]> {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return this.seed
      .map((note) => {
        const haystack = `${note.title ?? ''} ${note.content}`.toLowerCase();
        const hits = terms.filter((t) => haystack.includes(t)).length;
        return { ...note, score: Math.round((hits / terms.length) * 1000) / 1000 };
      })
      .filter((note) => note.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, k));
  }

  /** Offline there is no vault to embed; report zeros like the empty-path server. */
  async ingest(): Promise<VaultIngestReport> {
    return { files: 0, chunks: 0, embedded: 0, skipped: 0 };
  }
}

/** Remote vault client backed by the NestJS API. */
export class ApiVaultClient implements VaultClient {
  constructor(private readonly api: ApiClient) {}

  search(query: string, k = 5): Promise<VaultHit[]> {
    const params = new URLSearchParams({ q: query });
    if (k) params.set('k', String(k));
    return this.api.get<VaultHit[]>(`/vault/search?${params.toString()}`);
  }

  ingest(): Promise<VaultIngestReport> {
    return this.api.post<VaultIngestReport>('/vault/ingest');
  }
}

function createDefault(): VaultClient {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiVaultClient(new ApiClient(baseUrl)) : new LocalVaultClient();
}

let active: VaultClient = createDefault();

/** Override the active client (used by tests). */
export function setVaultClient(client: VaultClient): void {
  active = client;
}

export function searchVault(query: string, k?: number): Promise<VaultHit[]> {
  return active.search(query, k);
}

export function ingestVault(): Promise<VaultIngestReport> {
  return active.ingest();
}
