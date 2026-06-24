import { SourceMaterial } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';

/**
 * Repository contract for the Source Inbox (issue #28). Services depend only on
 * this interface so the backing store is swappable: in-memory (default) or a
 * durable JSON file when a non-`memory` persistence driver is configured.
 */
export const SOURCES_REPOSITORY = Symbol('SOURCES_REPOSITORY');

export interface SourcesRepository {
  list(): Promise<SourceMaterial[]>;
  findById(id: string): Promise<SourceMaterial | null>;
  upsert(source: SourceMaterial): Promise<SourceMaterial>;
}

const byNewest = (a: SourceMaterial, b: SourceMaterial) =>
  b.importedAt.localeCompare(a.importedAt);

/** Process-local store; newest sources are returned first. */
export class InMemorySourcesRepository implements SourcesRepository {
  private readonly byId = new Map<string, SourceMaterial>();

  async list(): Promise<SourceMaterial[]> {
    return [...this.byId.values()].sort(byNewest);
  }

  async findById(id: string): Promise<SourceMaterial | null> {
    return this.byId.get(id) ?? null;
  }

  async upsert(source: SourceMaterial): Promise<SourceMaterial> {
    this.byId.set(source.id, source);
    return source;
  }
}

/** Durable store backed by a JSON file — manual sources survive restarts. */
export class FileSourcesRepository implements SourcesRepository {
  constructor(private readonly store: JsonFileStore<SourceMaterial>) {}

  async list(): Promise<SourceMaterial[]> {
    return this.store.list().sort(byNewest);
  }

  async findById(id: string): Promise<SourceMaterial | null> {
    return this.store.get(id) ?? null;
  }

  async upsert(source: SourceMaterial): Promise<SourceMaterial> {
    return this.store.upsert(source);
  }
}
