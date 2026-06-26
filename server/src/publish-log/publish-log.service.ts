import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PublishLog } from '../domain/academic';
import { ContentService } from '../content/content.service';
import { PUBLISH_LOG_REPOSITORY, PublishLogRepository } from './publish-log.repository';

export interface RecordPublishInput {
  publishedUrl?: string;
  publishedAt?: string;
  notes?: string;
}

/**
 * The manual-publish assistant's audit trail: record that a reviewed, exported
 * variant was posted by hand, and where it went live. Recording requires the
 * variant to exist (404 otherwise); the channel is taken from the variant so the
 * log is self-describing.
 */
@Injectable()
export class PublishLogService {
  constructor(
    @Inject(PUBLISH_LOG_REPOSITORY) private readonly repo: PublishLogRepository,
    private readonly content: ContentService,
  ) {}

  /** Logs for a variant, newest first. */
  async listForVariant(variantId: string): Promise<PublishLog[]> {
    return this.repo.listByVariant(variantId);
  }

  async record(
    variantId: string,
    input: RecordPublishInput,
    now: Date = new Date(),
  ): Promise<PublishLog> {
    const variant = await this.content.getVariant(variantId); // 404 if missing

    if (input.publishedAt && Number.isNaN(Date.parse(input.publishedAt))) {
      throw new BadRequestException('publishedAt must be a valid ISO date');
    }
    if (input.publishedUrl !== undefined && typeof input.publishedUrl !== 'string') {
      throw new BadRequestException('publishedUrl must be a string');
    }

    const iso = now.toISOString();
    return this.repo.upsert({
      id: `pl_${randomUUID()}`,
      variantId,
      channel: variant.channel,
      publishedUrl: input.publishedUrl?.trim() || undefined,
      publishedAt: input.publishedAt ?? iso,
      notes: input.notes?.trim() || undefined,
      createdAt: iso,
    });
  }
}
