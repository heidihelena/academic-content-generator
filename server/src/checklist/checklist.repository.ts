import { CollectionStore } from '../persistence/json-file.store';
import { ChecklistItem } from '../domain/academic';

/**
 * Store for {@link ChecklistItem} entries. Swappable backing store: in-memory
 * (default), or a durable CollectionStore (JSON file or SQLite) on a non-`memory`
 * driver — the same pattern as the other repositories.
 */
export const CHECKLIST_REPOSITORY = Symbol('CHECKLIST_REPOSITORY');

const byOldest = (a: ChecklistItem, b: ChecklistItem) => a.createdAt.localeCompare(b.createdAt);

export interface ChecklistRepository {
  listByItem(itemId: string): Promise<ChecklistItem[]>;
  findById(id: string): Promise<ChecklistItem | null>;
  upsert(entry: ChecklistItem): Promise<ChecklistItem>;
  delete(id: string): Promise<void>;
}

export class InMemoryChecklistRepository implements ChecklistRepository {
  private readonly byId = new Map<string, ChecklistItem>();
  async listByItem(itemId: string) {
    return [...this.byId.values()].filter((c) => c.itemId === itemId).sort(byOldest);
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async upsert(entry: ChecklistItem) {
    this.byId.set(entry.id, entry);
    return entry;
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class StoreBackedChecklistRepository implements ChecklistRepository {
  constructor(private readonly store: CollectionStore<ChecklistItem>) {}
  async listByItem(itemId: string) {
    return this.store
      .list()
      .filter((c) => c.itemId === itemId)
      .sort(byOldest);
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async upsert(entry: ChecklistItem) {
    return this.store.upsert(entry);
  }
  async delete(id: string) {
    this.store.delete(id);
  }
}
