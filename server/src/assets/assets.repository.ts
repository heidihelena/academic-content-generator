import { CollectionStore } from '../persistence/json-file.store';
import { Asset } from '../domain/academic';

/**
 * Store for {@link Asset} entries. Swappable backing store: in-memory (default),
 * or a durable CollectionStore (JSON file or SQLite) on a non-`memory` driver.
 */
export const ASSETS_REPOSITORY = Symbol('ASSETS_REPOSITORY');

const byOldest = (a: Asset, b: Asset) => a.createdAt.localeCompare(b.createdAt);

export interface AssetsRepository {
  listByItem(itemId: string): Promise<Asset[]>;
  findById(id: string): Promise<Asset | null>;
  upsert(asset: Asset): Promise<Asset>;
  delete(id: string): Promise<void>;
}

export class InMemoryAssetsRepository implements AssetsRepository {
  private readonly byId = new Map<string, Asset>();
  async listByItem(itemId: string) {
    return [...this.byId.values()].filter((a) => a.itemId === itemId).sort(byOldest);
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async upsert(asset: Asset) {
    this.byId.set(asset.id, asset);
    return asset;
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class StoreBackedAssetsRepository implements AssetsRepository {
  constructor(private readonly store: CollectionStore<Asset>) {}
  async listByItem(itemId: string) {
    return this.store
      .list()
      .filter((a) => a.itemId === itemId)
      .sort(byOldest);
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async upsert(asset: Asset) {
    return this.store.upsert(asset);
  }
  async delete(id: string) {
    this.store.delete(id);
  }
}
