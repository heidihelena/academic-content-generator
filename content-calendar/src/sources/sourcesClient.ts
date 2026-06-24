import { ApiClient } from '../lib/api';
import { SOURCE_KINDS, type CreateSourceInput, type Source } from './sourcesTypes';

/**
 * Source Inbox client. Two implementations, chosen by `VITE_API_URL`:
 *  - `LocalSourcesClient` — in-memory, seeded with a few samples, used offline
 *    and in tests. (Obsidian vault notes only appear in API mode.)
 *  - `ApiSourcesClient` — the backend's hybrid inbox (`/sources`), which returns
 *    manual sources plus live vault notes.
 */
export interface SourcesClient {
  list(query?: string): Promise<Source[]>;
  create(input: CreateSourceInput): Promise<Source>;
}

export const SAMPLE_SOURCES: Source[] = [
  {
    id: 'src_sample_trees',
    kind: 'paper',
    title: 'Street trees and urban heat equity',
    authors: ['A. Researcher'],
    year: 2024,
    abstract:
      'Tree cover was strongly associated with cooler streets, and low-income neighbourhoods had less of it. Equity-targeted planting could narrow the gap.',
    tags: ['urban', 'climate', 'equity'],
    importedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'src_sample_sleep',
    kind: 'note',
    title: 'Sleep and memory consolidation',
    abstract:
      'Notes on how slow-wave sleep supports memory consolidation, and open questions about timing and ageing.',
    tags: ['neuro', 'sleep'],
    importedAt: '2026-01-01T00:00:00.000Z',
  },
];

function substringMatch(source: Source, q: string): boolean {
  return [source.title, source.abstract, source.body, ...source.tags]
    .filter((f): f is string => Boolean(f))
    .some((f) => f.toLowerCase().includes(q));
}

export class LocalSourcesClient implements SourcesClient {
  private sources: Source[];
  private seq = 0;

  constructor(seed: Source[] = SAMPLE_SOURCES) {
    this.sources = seed.map((s) => ({ ...s }));
  }

  async list(query?: string): Promise<Source[]> {
    const sorted = [...this.sources].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    const q = (query ?? '').trim().toLowerCase();
    return q ? sorted.filter((s) => substringMatch(s, q)) : sorted;
  }

  async create(input: CreateSourceInput): Promise<Source> {
    if (!input.title?.trim()) throw new Error('title is required');
    if (!SOURCE_KINDS.includes(input.kind)) throw new Error('invalid kind');
    const source: Source = {
      id: `src_local_${(this.seq += 1)}`,
      kind: input.kind,
      title: input.title.trim(),
      url: input.url,
      doi: input.doi,
      abstract: input.abstract,
      tags: input.tags ?? [],
      importedAt: new Date().toISOString(),
    };
    this.sources.push(source);
    return source;
  }
}

export class ApiSourcesClient implements SourcesClient {
  constructor(private readonly api: ApiClient) {}

  list(query?: string): Promise<Source[]> {
    const q = query?.trim();
    return this.api.get<Source[]>(`/sources${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }

  create(input: CreateSourceInput): Promise<Source> {
    return this.api.post<Source>('/sources', input);
  }
}

function createDefault(): SourcesClient {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiSourcesClient(new ApiClient(baseUrl)) : new LocalSourcesClient();
}

let active: SourcesClient = createDefault();

/** Override the active client (used by tests). */
export function setSourcesClient(client: SourcesClient): void {
  active = client;
}

export function listSources(query?: string): Promise<Source[]> {
  return active.list(query);
}

export function createSource(input: CreateSourceInput): Promise<Source> {
  return active.create(input);
}
