import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AUDIENCES,
  Audience,
  Campaign,
  CampaignStatusRollup,
  ContentStatus,
  rollupByStatus,
} from '../domain/academic';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from './campaigns.repository';

export interface CreateCampaignInput {
  title: string;
  goal?: string;
  audience?: Audience;
  startDate?: string;
  endDate?: string;
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>;

/**
 * Campaign planner (issue #36): plan a themed series of content across channels
 * and time. CRUD over campaigns plus a status rollup for the overview.
 */
@Injectable()
export class CampaignsService {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY) private readonly repo: CampaignsRepository,
  ) {}

  list(): Promise<Campaign[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Campaign> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(`Campaign ${id} not found`);
    return found;
  }

  async create(input: CreateCampaignInput, now: Date = new Date()): Promise<Campaign> {
    if (!input?.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    this.validateAudience(input.audience);
    this.validateDateRange(input.startDate, input.endDate);

    const iso = now.toISOString();
    return this.repo.upsert({
      id: `cmp_${randomUUID()}`,
      title: input.title.trim(),
      goal: input.goal,
      audience: input.audience,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: iso,
      updatedAt: iso,
    });
  }

  async update(
    id: string,
    input: UpdateCampaignInput,
    now: Date = new Date(),
  ): Promise<Campaign> {
    const existing = await this.get(id); // 404 if missing
    if (input.title !== undefined && !input.title.trim()) {
      throw new BadRequestException('title cannot be blank');
    }
    this.validateAudience(input.audience);
    const merged: Campaign = {
      ...existing,
      ...input,
      title: input.title?.trim() ?? existing.title,
      updatedAt: now.toISOString(),
    };
    this.validateDateRange(merged.startDate, merged.endDate);
    return this.repo.upsert(merged);
  }

  async remove(id: string): Promise<void> {
    await this.get(id); // 404 if missing
    await this.repo.delete(id);
  }

  /** Status rollup for a campaign's content items (supplied by the caller). */
  rollup(items: readonly { status: ContentStatus }[]): CampaignStatusRollup {
    return rollupByStatus(items);
  }

  private validateAudience(audience?: Audience): void {
    if (audience !== undefined && !AUDIENCES.includes(audience)) {
      throw new BadRequestException(`audience must be one of: ${AUDIENCES.join(', ')}`);
    }
  }

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate must not be after endDate');
    }
  }
}
