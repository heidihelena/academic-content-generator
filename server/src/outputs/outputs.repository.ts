import { ContentOutput } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';

/**
 * Repository contract for generated content outputs (talk, shorts, …).
 * Swappable backing store: in-memory (default) or a durable JSON file when a
 * non-`memory` persistence driver is configured — the same pattern as sources
 * and campaigns.
 */
export const OUTPUTS_REPOSITORY = Symbol('OUTPUTS_REPOSITORY');

export interface OutputsRepository {
  list(): Promise<ContentOutput[]>;
  listByCampaign(campaignId: string): Promise<ContentOutput[]>;
  listBySource(sourceId: string): Promise<ContentOutput[]>;
  findById(id: string): Promise<ContentOutput | null>;
  upsert(output: ContentOutput): Promise<ContentOutput>;
  delete(id: string): Promise<void>;
}

const byNewest = (a: ContentOutput, b: ContentOutput) => b.createdAt.localeCompare(a.createdAt);

/** Process-local store; newest outputs are returned first. */
export class InMemoryOutputsRepository implements OutputsRepository {
  private readonly byId = new Map<string, ContentOutput>();

  async list(): Promise<ContentOutput[]> {
    return [...this.byId.values()].sort(byNewest);
  }

  async listByCampaign(campaignId: string): Promise<ContentOutput[]> {
    return (await this.list()).filter((o) => o.campaignId === campaignId);
  }

  async listBySource(sourceId: string): Promise<ContentOutput[]> {
    return (await this.list()).filter((o) => o.sourceId === sourceId);
  }

  async findById(id: string): Promise<ContentOutput | null> {
    return this.byId.get(id) ?? null;
  }

  async upsert(output: ContentOutput): Promise<ContentOutput> {
    this.byId.set(output.id, output);
    return output;
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}

/** Durable store backed by a JSON file — outputs survive restarts. */
export class FileOutputsRepository implements OutputsRepository {
  constructor(private readonly store: JsonFileStore<ContentOutput>) {}

  async list(): Promise<ContentOutput[]> {
    return this.store.list().sort(byNewest);
  }

  async listByCampaign(campaignId: string): Promise<ContentOutput[]> {
    return (await this.list()).filter((o) => o.campaignId === campaignId);
  }

  async listBySource(sourceId: string): Promise<ContentOutput[]> {
    return (await this.list()).filter((o) => o.sourceId === sourceId);
  }

  async findById(id: string): Promise<ContentOutput | null> {
    return this.store.get(id) ?? null;
  }

  async upsert(output: ContentOutput): Promise<ContentOutput> {
    return this.store.upsert(output);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
