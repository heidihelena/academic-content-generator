import { CollectionStore } from '../persistence/json-file.store';
import { StatusChange } from '../domain/academic';

/**
 * Store for {@link StatusChange} entries (the variant approval-workflow audit
 * trail). Swappable backing store: in-memory (default), or a durable
 * CollectionStore (JSON file or SQLite) on a non-`memory` driver.
 */
export const STATUS_HISTORY_REPOSITORY = Symbol('STATUS_HISTORY_REPOSITORY');

const byOldest = (a: StatusChange, b: StatusChange) => a.at.localeCompare(b.at);

export interface StatusHistoryRepository {
  listByVariant(variantId: string): Promise<StatusChange[]>;
  upsert(change: StatusChange): Promise<StatusChange>;
}

export class InMemoryStatusHistoryRepository implements StatusHistoryRepository {
  private readonly byId = new Map<string, StatusChange>();
  async listByVariant(variantId: string) {
    return [...this.byId.values()].filter((c) => c.variantId === variantId).sort(byOldest);
  }
  async upsert(change: StatusChange) {
    this.byId.set(change.id, change);
    return change;
  }
}

export class StoreBackedStatusHistoryRepository implements StatusHistoryRepository {
  constructor(private readonly store: CollectionStore<StatusChange>) {}
  async listByVariant(variantId: string) {
    return this.store
      .list()
      .filter((c) => c.variantId === variantId)
      .sort(byOldest);
  }
  async upsert(change: StatusChange) {
    return this.store.upsert(change);
  }
}
