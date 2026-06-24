import { SourceMaterial } from '../domain/academic';

/**
 * Repository contract for the Source Inbox (issue #28). Services depend only on
 * this interface so the backing store can be swapped later.
 *
 * For now the only implementation is the in-memory store below — the Source
 * Inbox is usable with zero config. Wiring SourceMaterial into the swappable
 * persistence drivers (memory/sqlite/neon) is a follow-up.
 */
export const SOURCES_REPOSITORY = Symbol('SOURCES_REPOSITORY');

export interface SourcesRepository {
  list(): Promise<SourceMaterial[]>;
  findById(id: string): Promise<SourceMaterial | null>;
  upsert(source: SourceMaterial): Promise<SourceMaterial>;
}

/** Process-local store; newest sources are returned first. */
export class InMemorySourcesRepository implements SourcesRepository {
  private readonly byId = new Map<string, SourceMaterial>();

  async list(): Promise<SourceMaterial[]> {
    return [...this.byId.values()].sort((a, b) =>
      b.importedAt.localeCompare(a.importedAt),
    );
  }

  async findById(id: string): Promise<SourceMaterial | null> {
    return this.byId.get(id) ?? null;
  }

  async upsert(source: SourceMaterial): Promise<SourceMaterial> {
    this.byId.set(source.id, source);
    return source;
  }
}
