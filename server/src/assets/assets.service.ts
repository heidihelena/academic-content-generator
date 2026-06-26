import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ASSET_TYPES, Asset, AssetType } from '../domain/academic';
import { ContentService } from '../content/content.service';
import { ASSETS_REPOSITORY, AssetsRepository } from './assets.repository';

export interface AttachAssetInput {
  url: string;
  type: AssetType;
  label?: string;
}

/**
 * Media attachments on a content item. The bytes are uploaded via the existing
 * media endpoint; this records the resulting URL against the item. All ops are
 * scoped to the item's owner (via {@link ContentService.getItem}).
 */
@Injectable()
export class AssetsService {
  constructor(
    @Inject(ASSETS_REPOSITORY) private readonly repo: AssetsRepository,
    private readonly content: ContentService,
  ) {}

  async listForItem(itemId: string, scope?: string): Promise<Asset[]> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    return this.repo.listByItem(itemId);
  }

  async attach(
    itemId: string,
    input: AttachAssetInput,
    scope?: string,
    now: Date = new Date(),
  ): Promise<Asset> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    if (!input?.url?.trim()) throw new BadRequestException('asset url is required');
    if (!ASSET_TYPES.includes(input.type)) {
      throw new BadRequestException(`type must be one of: ${ASSET_TYPES.join(', ')}`);
    }
    return this.repo.upsert({
      id: `as_${randomUUID()}`,
      itemId,
      url: input.url.trim(),
      type: input.type,
      label: input.label?.trim() || undefined,
      createdAt: now.toISOString(),
    });
  }

  async remove(itemId: string, assetId: string, scope?: string): Promise<void> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    const asset = await this.repo.findById(assetId);
    if (!asset || asset.itemId !== itemId) {
      throw new NotFoundException(`Asset ${assetId} not found`);
    }
    await this.repo.delete(assetId);
  }
}
