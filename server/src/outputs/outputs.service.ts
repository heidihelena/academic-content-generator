import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONTENT_STATUSES, ContentOutput, ContentStatus } from '../domain/academic';
import { OUTPUTS_REPOSITORY, OutputsRepository } from './outputs.repository';

/**
 * Store for generated content outputs — the system of record that makes a
 * campaign a usable series. Generators (talk-package, …) save here; the planner
 * lists by campaign or source. Markdown export to the vault is a projection on
 * top of this store, not a replacement for it.
 */
@Injectable()
export class OutputsService {
  constructor(@Inject(OUTPUTS_REPOSITORY) private readonly repo: OutputsRepository) {}

  list(filter: { campaignId?: string; sourceId?: string } = {}): Promise<ContentOutput[]> {
    if (filter.campaignId) return this.repo.listByCampaign(filter.campaignId);
    if (filter.sourceId) return this.repo.listBySource(filter.sourceId);
    return this.repo.list();
  }

  async get(id: string): Promise<ContentOutput> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(`Output ${id} not found`);
    return found;
  }

  save(output: ContentOutput): Promise<ContentOutput> {
    return this.repo.upsert(output);
  }

  /** Persist a batch (e.g. a talk + its shorts), preserving order. */
  saveMany(outputs: readonly ContentOutput[]): Promise<ContentOutput[]> {
    return Promise.all(outputs.map((o) => this.repo.upsert(o)));
  }

  async updateStatus(
    id: string,
    status: ContentStatus,
    now: Date = new Date(),
  ): Promise<ContentOutput> {
    if (!CONTENT_STATUSES.includes(status)) {
      throw new BadRequestException(`status must be one of: ${CONTENT_STATUSES.join(', ')}`);
    }
    const existing = await this.get(id); // 404 if missing
    return this.repo.upsert({ ...existing, status, updatedAt: now.toISOString() });
  }

  async remove(id: string): Promise<void> {
    await this.get(id); // 404 if missing
    await this.repo.delete(id);
  }
}
