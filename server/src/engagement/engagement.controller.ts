import { Controller, Post } from '@nestjs/common';
import { EngagementSyncService } from './engagement-sync.service';

@Controller('engagement')
export class EngagementController {
  constructor(private readonly sync: EngagementSyncService) {}

  /**
   * POST /api/engagement/sync — pull engagement for exported variants from the
   * connected source and feed it to the timing optimizer as weighted outcomes.
   */
  @Post('sync')
  run() {
    return this.sync.sync();
  }
}
