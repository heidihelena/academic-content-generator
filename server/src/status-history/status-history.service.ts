import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContentStatus, StatusChange } from '../domain/academic';
import {
  STATUS_HISTORY_REPOSITORY,
  StatusHistoryRepository,
} from './status-history.repository';

/**
 * The variant approval-workflow audit trail. {@link ContentService} calls
 * {@link record} on each status transition; recording is best-effort and never
 * throws back into the content operation (the audit log is advisory, like the
 * timing learning loop).
 */
@Injectable()
export class StatusHistoryService {
  private readonly logger = new Logger(StatusHistoryService.name);

  constructor(
    @Inject(STATUS_HISTORY_REPOSITORY) private readonly repo: StatusHistoryRepository,
  ) {}

  listForVariant(variantId: string): Promise<StatusChange[]> {
    return this.repo.listByVariant(variantId);
  }

  async record(
    variantId: string,
    from: ContentStatus | undefined,
    to: ContentStatus,
    actor?: string,
    now: Date = new Date(),
  ): Promise<void> {
    if (from === to) return; // no-op transition
    try {
      await this.repo.upsert({
        id: `sc_${randomUUID()}`,
        variantId,
        from,
        to,
        actor,
        at: now.toISOString(),
      });
    } catch (err) {
      this.logger.warn(`Failed to record status change for ${variantId}: ${String(err)}`);
    }
  }
}
