import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AUDIENCES,
  Audience,
  CLAIM_RISKS,
  CONTENT_CHANNELS,
  CONTENT_PILLARS,
  CONTENT_STATUSES,
  ClaimRisk,
  ContentChannel,
  ContentItem,
  ContentPillar,
  ContentStatus,
  ContentVariant,
  EVIDENCE_LEVELS,
  EvidenceLevel,
  ReviewState,
  VARIANT_FORMATS,
  VariantFormat,
} from '../domain/academic';
import {
  CONTENT_ITEMS_REPOSITORY,
  CONTENT_VARIANTS_REPOSITORY,
  ContentItemsRepository,
  ContentVariantsRepository,
} from './content.repository';

export interface CreateContentItemInput {
  title: string;
  sourceIds?: string[];
  campaignId?: string;
  ownerId?: string;
  audience: Audience;
  pillar: ContentPillar;
  evidenceLevel: EvidenceLevel;
  claimRisk: ClaimRisk;
  status?: ContentStatus;
}

export type UpdateContentItemInput = Partial<Omit<CreateContentItemInput, 'title'>> & {
  title?: string;
};

export interface CreateVariantInput {
  channel: ContentChannel;
  format: VariantFormat;
  body: string;
  hook?: string;
  hashtags?: string[];
  status?: ContentStatus;
  safetyReview?: ReviewState;
  citationReview?: ReviewState;
}

/**
 * The ContentItem + ContentVariant store: one idea, many channel/format
 * variants. The item holds strategy (pillar, evidence, claim risk); each
 * variant holds copy and its own lifecycle. Export is gated by the variant's
 * safety review — the same patient-safe rule as the rest of the system.
 */
@Injectable()
export class ContentService {
  constructor(
    @Inject(CONTENT_ITEMS_REPOSITORY) private readonly items: ContentItemsRepository,
    @Inject(CONTENT_VARIANTS_REPOSITORY) private readonly variants: ContentVariantsRepository,
  ) {}

  // --- items -------------------------------------------------------------
  async listItems(filter: { campaignId?: string; sourceId?: string } = {}): Promise<ContentItem[]> {
    let all = await this.items.list();
    if (filter.campaignId) all = all.filter((i) => i.campaignId === filter.campaignId);
    if (filter.sourceId) all = all.filter((i) => i.sourceIds.includes(filter.sourceId as string));
    return all;
  }

  async getItem(id: string): Promise<ContentItem> {
    const found = await this.items.findById(id);
    if (!found) throw new NotFoundException(`ContentItem ${id} not found`);
    return found;
  }

  async createItem(input: CreateContentItemInput, now: Date = new Date()): Promise<ContentItem> {
    if (!input?.title?.trim()) throw new BadRequestException('title is required');
    this.assertEnum('audience', input.audience, AUDIENCES);
    this.assertEnum('pillar', input.pillar, CONTENT_PILLARS);
    this.assertEnum('evidenceLevel', input.evidenceLevel, EVIDENCE_LEVELS);
    this.assertEnum('claimRisk', input.claimRisk, CLAIM_RISKS);
    if (input.status) this.assertEnum('status', input.status, CONTENT_STATUSES);

    const iso = now.toISOString();
    return this.items.upsert({
      id: `ci_${randomUUID()}`,
      title: input.title.trim(),
      sourceIds: input.sourceIds ?? [],
      campaignId: input.campaignId,
      ownerId: input.ownerId,
      audience: input.audience,
      pillar: input.pillar,
      evidenceLevel: input.evidenceLevel,
      claimRisk: input.claimRisk,
      status: input.status ?? 'idea',
      createdAt: iso,
      updatedAt: iso,
    });
  }

  async updateItem(
    id: string,
    input: UpdateContentItemInput,
    now: Date = new Date(),
  ): Promise<ContentItem> {
    const existing = await this.getItem(id);
    if (input.title !== undefined && !input.title.trim())
      throw new BadRequestException('title cannot be blank');
    if (input.audience) this.assertEnum('audience', input.audience, AUDIENCES);
    if (input.pillar) this.assertEnum('pillar', input.pillar, CONTENT_PILLARS);
    if (input.evidenceLevel) this.assertEnum('evidenceLevel', input.evidenceLevel, EVIDENCE_LEVELS);
    if (input.claimRisk) this.assertEnum('claimRisk', input.claimRisk, CLAIM_RISKS);
    if (input.status) this.assertEnum('status', input.status, CONTENT_STATUSES);

    return this.items.upsert({
      ...existing,
      ...input,
      title: input.title?.trim() ?? existing.title,
      updatedAt: now.toISOString(),
    });
  }

  async removeItem(id: string): Promise<void> {
    await this.getItem(id); // 404 if missing
    for (const variant of await this.variants.listByItem(id)) {
      await this.variants.delete(variant.id);
    }
    await this.items.delete(id);
  }

  // --- variants ----------------------------------------------------------
  listVariants(contentItemId: string): Promise<ContentVariant[]> {
    return this.variants.listByItem(contentItemId);
  }

  async getVariant(id: string): Promise<ContentVariant> {
    const found = await this.variants.findById(id);
    if (!found) throw new NotFoundException(`ContentVariant ${id} not found`);
    return found;
  }

  async addVariant(
    contentItemId: string,
    input: CreateVariantInput,
    now: Date = new Date(),
  ): Promise<ContentVariant> {
    await this.getItem(contentItemId); // 404 if the item is missing
    this.assertEnum('channel', input.channel, CONTENT_CHANNELS);
    this.assertEnum('format', input.format, VARIANT_FORMATS);
    if (input.status) this.assertEnum('status', input.status, CONTENT_STATUSES);
    if (typeof input.body !== 'string') throw new BadRequestException('body is required');

    const iso = now.toISOString();
    return this.variants.upsert({
      id: `cv_${randomUUID()}`,
      contentItemId,
      channel: input.channel,
      format: input.format,
      body: input.body,
      hook: input.hook,
      hashtags: input.hashtags ?? [],
      status: input.status ?? 'draft',
      safetyReview: input.safetyReview,
      citationReview: input.citationReview,
      createdAt: iso,
      updatedAt: iso,
    });
  }

  async updateVariant(
    id: string,
    patch: Partial<Pick<ContentVariant, 'body' | 'hook' | 'hashtags' | 'status' | 'safetyReview' | 'citationReview'>>,
    now: Date = new Date(),
  ): Promise<ContentVariant> {
    const existing = await this.getVariant(id);
    if (patch.status) {
      this.assertEnum('status', patch.status, CONTENT_STATUSES);
      if (patch.status === 'exported') this.assertCleared(existing);
    }
    return this.variants.upsert({ ...existing, ...patch, updatedAt: now.toISOString() });
  }

  /** Schedule a variant with a date — the last step before export. */
  async scheduleVariant(id: string, scheduledAt: string, now: Date = new Date()): Promise<ContentVariant> {
    if (!scheduledAt?.trim() || Number.isNaN(Date.parse(scheduledAt))) {
      throw new BadRequestException('scheduledAt must be a valid ISO date');
    }
    const existing = await this.getVariant(id);
    return this.variants.upsert({
      ...existing,
      status: 'scheduled',
      scheduledAt,
      updatedAt: now.toISOString(),
    });
  }

  /** Export a variant — gated by its safety review (patient-safe: blocks are fatal). */
  async exportVariant(id: string, now: Date = new Date()): Promise<ContentVariant> {
    const existing = await this.getVariant(id);
    this.assertCleared(existing);
    const iso = now.toISOString();
    return this.variants.upsert({ ...existing, status: 'exported', exportedAt: iso, updatedAt: iso });
  }

  async removeVariant(id: string): Promise<void> {
    await this.getVariant(id); // 404 if missing
    await this.variants.delete(id);
  }

  private assertCleared(variant: ContentVariant): void {
    if (!variant.safetyReview?.cleared) {
      throw new BadRequestException(
        'Cannot export: the safety review has unresolved blocking findings (or has not run).',
      );
    }
  }

  private assertEnum<T>(field: string, value: T, allowed: readonly T[]): void {
    if (!allowed.includes(value)) {
      throw new BadRequestException(`${field} must be one of: ${allowed.join(', ')}`);
    }
  }
}
