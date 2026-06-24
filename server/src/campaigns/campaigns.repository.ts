import { Campaign } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';

/**
 * Repository contract for campaigns (issue #36). Swappable backing store:
 * in-memory (default) or a durable JSON file when a non-`memory` persistence
 * driver is configured.
 */
export const CAMPAIGNS_REPOSITORY = Symbol('CAMPAIGNS_REPOSITORY');

export interface CampaignsRepository {
  list(): Promise<Campaign[]>;
  findById(id: string): Promise<Campaign | null>;
  upsert(campaign: Campaign): Promise<Campaign>;
  delete(id: string): Promise<void>;
}

const byNewest = (a: Campaign, b: Campaign) => b.createdAt.localeCompare(a.createdAt);

/** Process-local store; newest campaigns are returned first. */
export class InMemoryCampaignsRepository implements CampaignsRepository {
  private readonly byId = new Map<string, Campaign>();

  async list(): Promise<Campaign[]> {
    return [...this.byId.values()].sort(byNewest);
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.byId.get(id) ?? null;
  }

  async upsert(campaign: Campaign): Promise<Campaign> {
    this.byId.set(campaign.id, campaign);
    return campaign;
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}

/** Durable store backed by a JSON file — campaigns survive restarts. */
export class FileCampaignsRepository implements CampaignsRepository {
  constructor(private readonly store: JsonFileStore<Campaign>) {}

  async list(): Promise<Campaign[]> {
    return this.store.list().sort(byNewest);
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.store.get(id) ?? null;
  }

  async upsert(campaign: Campaign): Promise<Campaign> {
    return this.store.upsert(campaign);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
