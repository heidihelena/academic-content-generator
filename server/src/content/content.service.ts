import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { TimingService } from '../timing/timing.service';
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
  exportBlockers,
  VARIANT_FORMATS,
  VariantFormat,
} from '../domain/academic';
import {
  CONTENT_ITEMS_REPOSITORY,
  CONTENT_VARIANTS_REPOSITORY,
  ContentItemsRepository,
  ContentVariantsRepository,
} from './content.repository';
import { StatusHistoryService } from '../status-history/status-history.service';

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

/** A scheduled variant flattened for the calendar view. */
export interface CalendarEntry {
  variantId: string;
  itemId: string;
  title: string;
  channel: ContentChannel;
  format: VariantFormat;
  audience: Audience;
  scheduledAt: string;
  status: ContentStatus;
  exported: boolean;
}

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
    @Optional() private readonly timing?: TimingService,
    @Optional() private readonly statusHistory?: StatusHistoryService,
  ) {}

  // --- items -------------------------------------------------------------
  /**
   * Owner scoping (multi-user). `scope` is the current user's id; when given,
   * only items they own — plus legacy/unowned items — are visible. Omitting it
   * (internal callers) means no scoping. In the open single-user default every
   * request is `'local'`, so this is a no-op there.
   */
  private canAccess(item: ContentItem, scope?: string): boolean {
    return !scope || !item.ownerId || item.ownerId === scope;
  }

  async listItems(
    filter: { campaignId?: string; sourceId?: string } = {},
    scope?: string,
  ): Promise<ContentItem[]> {
    let all = await this.items.list();
    all = all.filter((i) => this.canAccess(i, scope));
    if (filter.campaignId) all = all.filter((i) => i.campaignId === filter.campaignId);
    if (filter.sourceId) all = all.filter((i) => i.sourceIds.includes(filter.sourceId as string));
    return all;
  }

  async getItem(id: string, scope?: string): Promise<ContentItem> {
    const found = await this.items.findById(id);
    // Don't reveal another owner's item exists — 404, not 403.
    if (!found || !this.canAccess(found, scope)) {
      throw new NotFoundException(`ContentItem ${id} not found`);
    }
    return found;
  }

  async createItem(
    input: CreateContentItemInput,
    now: Date = new Date(),
    scope?: string,
  ): Promise<ContentItem> {
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
      // The authenticated owner wins over any client-supplied ownerId (no spoofing).
      ownerId: scope ?? input.ownerId,
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
    scope?: string,
  ): Promise<ContentItem> {
    const existing = await this.getItem(id, scope);
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

  async removeItem(id: string, scope?: string): Promise<void> {
    await this.getItem(id, scope); // 404 if missing or not owned
    for (const variant of await this.variants.listByItem(id)) {
      await this.variants.delete(variant.id);
    }
    await this.items.delete(id);
  }

  // --- variants ----------------------------------------------------------
  /** Variants are reached through their owned item, so listing is scoped via the
   *  parent item's ownership. Returns [] for a missing or unowned item (rather
   *  than throwing) — both empty, so another owner's item isn't revealed. */
  async listVariants(contentItemId: string, scope?: string): Promise<ContentVariant[]> {
    const item = await this.items.findById(contentItemId);
    if (!item || !this.canAccess(item, scope)) return [];
    return this.variants.listByItem(contentItemId);
  }

  /** All exported variants — the ones whose real engagement can be synced. */
  async listExportedVariants(): Promise<ContentVariant[]> {
    return (await this.variants.list()).filter((v) => v.status === 'exported');
  }

  /**
   * Calendar feed: every variant with a scheduled date, joined to its item for
   * display context, sorted by time. Powers the calendar view.
   */
  async scheduledFeed(scope?: string): Promise<CalendarEntry[]> {
    const variants = (await this.variants.list()).filter((v) => v.scheduledAt);
    const itemCache = new Map<string, ContentItem | null>();
    const entries: CalendarEntry[] = [];
    for (const v of variants) {
      if (!itemCache.has(v.contentItemId)) {
        itemCache.set(v.contentItemId, await this.items.findById(v.contentItemId));
      }
      const item = itemCache.get(v.contentItemId) ?? null;
      // Owner scoping: never surface another user's scheduled content in the feed.
      if (item && !this.canAccess(item, scope)) continue;
      entries.push({
        variantId: v.id,
        itemId: v.contentItemId,
        title: item?.title ?? '(untitled)',
        channel: v.channel,
        format: v.format,
        audience: item?.audience ?? 'peers',
        scheduledAt: v.scheduledAt as string,
        status: v.status,
        exported: v.status === 'exported',
      });
    }
    return entries.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  async getVariant(id: string, scope?: string): Promise<ContentVariant> {
    const found = await this.variants.findById(id);
    // Scope a variant through its parent item's ownership — 404 (not 403) so an
    // unowned variant's existence isn't revealed, matching the item rule.
    if (found && scope) {
      const item = await this.items.findById(found.contentItemId);
      if (!item || !this.canAccess(item, scope)) {
        throw new NotFoundException(`ContentVariant ${id} not found`);
      }
    }
    if (!found) throw new NotFoundException(`ContentVariant ${id} not found`);
    return found;
  }

  async addVariant(
    contentItemId: string,
    input: CreateVariantInput,
    now: Date = new Date(),
    scope?: string,
  ): Promise<ContentVariant> {
    await this.getItem(contentItemId, scope); // 404 if missing or not owned
    this.assertEnum('channel', input.channel, CONTENT_CHANNELS);
    this.assertEnum('format', input.format, VARIANT_FORMATS);
    if (input.status) this.assertEnum('status', input.status, CONTENT_STATUSES);
    if (typeof input.body !== 'string') throw new BadRequestException('body is required');

    const iso = now.toISOString();
    const created = await this.variants.upsert({
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
    await this.statusHistory?.record(created.id, undefined, created.status, scope, now);
    return created;
  }

  async updateVariant(
    id: string,
    patch: Partial<Pick<ContentVariant, 'body' | 'hook' | 'hashtags' | 'status' | 'safetyReview' | 'citationReview'>>,
    now: Date = new Date(),
    scope?: string,
  ): Promise<ContentVariant> {
    const existing = await this.getVariant(id, scope);
    if (patch.status) {
      this.assertEnum('status', patch.status, CONTENT_STATUSES);
      if (patch.status === 'exported') this.assertCleared(existing);
    }
    const updated = await this.variants.upsert({ ...existing, ...patch, updatedAt: now.toISOString() });
    if (patch.status) await this.statusHistory?.record(id, existing.status, updated.status, undefined, now);
    return updated;
  }

  /** Schedule a variant with a date — the last step before export. */
  async scheduleVariant(
    id: string,
    scheduledAt: string,
    now: Date = new Date(),
    scope?: string,
  ): Promise<ContentVariant> {
    if (!scheduledAt?.trim() || Number.isNaN(Date.parse(scheduledAt))) {
      throw new BadRequestException('scheduledAt must be a valid ISO date');
    }
    const existing = await this.getVariant(id, scope);
    const scheduled = await this.variants.upsert({
      ...existing,
      status: 'scheduled',
      scheduledAt,
      updatedAt: now.toISOString(),
    });
    await this.statusHistory?.record(id, existing.status, 'scheduled', undefined, now);
    return scheduled;
  }

  /** Export a variant — gated by its safety review (patient-safe: blocks are fatal). */
  async exportVariant(id: string, now: Date = new Date(), scope?: string): Promise<ContentVariant> {
    const existing = await this.getVariant(id, scope);
    this.assertCleared(existing);
    const iso = now.toISOString();
    const exported = await this.variants.upsert({
      ...existing,
      status: 'exported',
      exportedAt: iso,
      updatedAt: iso,
    });
    await this.statusHistory?.record(id, existing.status, 'exported', undefined, now);
    await this.recordTimingOutcome(exported, iso, now);
    return exported;
  }

  /**
   * Close the learning loop: a successful export is a positive timing outcome
   * for its (channel, audience, slot). Best-effort — a timing failure must never
   * block the export, and it's a no-op when the optimizer isn't wired in.
   */
  private async recordTimingOutcome(variant: ContentVariant, iso: string, now: Date): Promise<void> {
    if (!this.timing) return;
    try {
      const item = await this.items.findById(variant.contentItemId);
      if (!item) return;
      await this.timing.recordOutcome(
        {
          channel: variant.channel,
          audience: item.audience,
          scheduledAt: variant.scheduledAt ?? iso,
          signal: 1,
        },
        now,
      );
    } catch {
      // learning is advisory; never let it break export
    }
  }

  /** Mark a variant human-reviewed (signs off the explicit export gate). */
  async markReviewed(id: string, now: Date = new Date(), scope?: string): Promise<ContentVariant> {
    const existing = await this.getVariant(id, scope);
    return this.variants.upsert({ ...existing, humanReviewedAt: now.toISOString(), updatedAt: now.toISOString() });
  }

  async removeVariant(id: string, scope?: string): Promise<void> {
    await this.getVariant(id, scope); // 404 if missing or not owned
    await this.variants.delete(id);
  }

  private assertCleared(variant: ContentVariant): void {
    const blockers = exportBlockers(variant);
    if (blockers.length) {
      throw new BadRequestException(`Cannot export: ${blockers.join(' ')}`);
    }
  }

  private assertEnum<T>(field: string, value: T, allowed: readonly T[]): void {
    if (!allowed.includes(value)) {
      throw new BadRequestException(`${field} must be one of: ${allowed.join(', ')}`);
    }
  }
}
