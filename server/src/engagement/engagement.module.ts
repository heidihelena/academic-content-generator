import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { TimingModule } from '../timing/timing.module';
import { EngagementController } from './engagement.controller';
import { EngagementSyncService } from './engagement-sync.service';
import { ENGAGEMENT_SOURCE, MockEngagementSource } from './engagement-source';

/**
 * Engagement sync: feeds real (or mock) reach back into the timing optimizer.
 * The source is mock by default; a real connected-account source is the
 * config-gated edge.
 */
@Module({
  imports: [ContentModule, TimingModule],
  providers: [
    EngagementSyncService,
    { provide: ENGAGEMENT_SOURCE, useClass: MockEngagementSource },
  ],
  controllers: [EngagementController],
  exports: [EngagementSyncService],
})
export class EngagementModule {}
