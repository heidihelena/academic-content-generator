import { CollectionStore } from '../persistence/json-file.store';
import { PublishLog } from '../domain/academic';

/**
 * Store for {@link PublishLog} entries. Swappable backing store: in-memory
 * (default), or a durable CollectionStore (JSON file or SQLite) on a non-`memory`
 * driver — the same pattern as the other repositories.
 */
export const PUBLISH_LOG_REPOSITORY = Symbol('PUBLISH_LOG_REPOSITORY');

const byNewest = (a: PublishLog, b: PublishLog) => b.publishedAt.localeCompare(a.publishedAt);

export interface PublishLogRepository {
  list(): Promise<PublishLog[]>;
  listByVariant(variantId: string): Promise<PublishLog[]>;
  upsert(log: PublishLog): Promise<PublishLog>;
}

export class InMemoryPublishLogRepository implements PublishLogRepository {
  private readonly byId = new Map<string, PublishLog>();
  async list() {
    return [...this.byId.values()].sort(byNewest);
  }
  async listByVariant(variantId: string) {
    return (await this.list()).filter((l) => l.variantId === variantId);
  }
  async upsert(log: PublishLog) {
    this.byId.set(log.id, log);
    return log;
  }
}

export class StoreBackedPublishLogRepository implements PublishLogRepository {
  constructor(private readonly store: CollectionStore<PublishLog>) {}
  async list() {
    return this.store.list().sort(byNewest);
  }
  async listByVariant(variantId: string) {
    return (await this.list()).filter((l) => l.variantId === variantId);
  }
  async upsert(log: PublishLog) {
    return this.store.upsert(log);
  }
}
