import { Inject, Injectable, Logger } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { TimingService } from '../timing/timing.service';
import { ENGAGEMENT_SOURCE, EngagementSource } from './engagement-source';

export interface EngagementSyncResult {
  synced: number;
  outcomes: Array<{ variantId: string; channel: string; signal: number }>;
}

/**
 * Pulls real engagement for exported variants and feeds it to the timing
 * optimizer as weighted outcomes — the bridge from "what shipped and how it did"
 * back into "when to post next".
 */
@Injectable()
export class EngagementSyncService {
  private readonly logger = new Logger(EngagementSyncService.name);

  constructor(
    private readonly content: ContentService,
    private readonly timing: TimingService,
    @Inject(ENGAGEMENT_SOURCE) private readonly source: EngagementSource,
  ) {}

  async sync(now: Date = new Date()): Promise<EngagementSyncResult> {
    const exported = await this.content.listExportedVariants();
    const outcomes: EngagementSyncResult['outcomes'] = [];

    for (const variant of exported) {
      const metrics = await this.source.fetch({ channel: variant.channel, variantId: variant.id });
      if (!metrics) continue;
      let audience;
      try {
        audience = (await this.content.getItem(variant.contentItemId)).audience;
      } catch {
        continue; // item gone — skip
      }
      const { signal } = await this.timing.recordEngagement(
        {
          channel: variant.channel,
          audience,
          scheduledAt: variant.scheduledAt ?? variant.exportedAt,
          metrics,
        },
        now,
      );
      outcomes.push({ variantId: variant.id, channel: variant.channel, signal });
    }

    this.logger.log(`synced engagement for ${outcomes.length} exported variant(s) via ${this.source.name}`);
    return { synced: outcomes.length, outcomes };
  }
}
