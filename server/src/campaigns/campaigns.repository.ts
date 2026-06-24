import { Campaign } from '../domain/academic';

/**
 * Repository contract for campaigns (issue #36). The only implementation today
 * is the in-memory store below (local-first, zero config); wiring campaigns into
 * the swappable persistence drivers is a follow-up.
 */
export const CAMPAIGNS_REPOSITORY = Symbol('CAMPAIGNS_REPOSITORY');

export interface CampaignsRepository {
  list(): Promise<Campaign[]>;
  findById(id: string): Promise<Campaign | null>;
  upsert(campaign: Campaign): Promise<Campaign>;
  delete(id: string): Promise<void>;
}

/** Process-local store; newest campaigns are returned first. */
export class InMemoryCampaignsRepository implements CampaignsRepository {
  private readonly byId = new Map<string, Campaign>();

  async list(): Promise<Campaign[]> {
    return [...this.byId.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
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
