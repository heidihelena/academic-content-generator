import { ContentItem, ContentVariant } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';

/**
 * Repositories for the ContentItem + ContentVariant model. Swappable backing
 * store: in-memory (default) or a durable JSON file when a non-`memory`
 * persistence driver is configured — the same pattern as sources/campaigns.
 */
export const CONTENT_ITEMS_REPOSITORY = Symbol('CONTENT_ITEMS_REPOSITORY');
export const CONTENT_VARIANTS_REPOSITORY = Symbol('CONTENT_VARIANTS_REPOSITORY');

const byNewest = <T extends { createdAt: string }>(a: T, b: T) =>
  b.createdAt.localeCompare(a.createdAt);

export interface ContentItemsRepository {
  list(): Promise<ContentItem[]>;
  findById(id: string): Promise<ContentItem | null>;
  upsert(item: ContentItem): Promise<ContentItem>;
  delete(id: string): Promise<void>;
}

export interface ContentVariantsRepository {
  list(): Promise<ContentVariant[]>;
  listByItem(contentItemId: string): Promise<ContentVariant[]>;
  findById(id: string): Promise<ContentVariant | null>;
  upsert(variant: ContentVariant): Promise<ContentVariant>;
  delete(id: string): Promise<void>;
}

export class InMemoryContentItemsRepository implements ContentItemsRepository {
  private readonly byId = new Map<string, ContentItem>();
  async list() {
    return [...this.byId.values()].sort(byNewest);
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async upsert(item: ContentItem) {
    this.byId.set(item.id, item);
    return item;
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class InMemoryContentVariantsRepository implements ContentVariantsRepository {
  private readonly byId = new Map<string, ContentVariant>();
  async list() {
    return [...this.byId.values()].sort(byNewest);
  }
  async listByItem(contentItemId: string) {
    return (await this.list()).filter((v) => v.contentItemId === contentItemId);
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async upsert(variant: ContentVariant) {
    this.byId.set(variant.id, variant);
    return variant;
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class FileContentItemsRepository implements ContentItemsRepository {
  constructor(private readonly store: JsonFileStore<ContentItem>) {}
  async list() {
    return this.store.list().sort(byNewest);
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async upsert(item: ContentItem) {
    return this.store.upsert(item);
  }
  async delete(id: string) {
    this.store.delete(id);
  }
}

export class FileContentVariantsRepository implements ContentVariantsRepository {
  constructor(private readonly store: JsonFileStore<ContentVariant>) {}
  async list() {
    return this.store.list().sort(byNewest);
  }
  async listByItem(contentItemId: string) {
    return (await this.list()).filter((v) => v.contentItemId === contentItemId);
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async upsert(variant: ContentVariant) {
    return this.store.upsert(variant);
  }
  async delete(id: string) {
    this.store.delete(id);
  }
}
