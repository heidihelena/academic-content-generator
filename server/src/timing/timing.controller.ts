import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Audience, ContentChannel } from '../domain/academic';
import { EngagementMetrics } from './engagement';
import { TimingOutcome } from './timing.types';
import { TimingService } from './timing.service';

@Controller('timing')
export class TimingController {
  constructor(private readonly timing: TimingService) {}

  /** GET /api/timing/suggestions?channel=&audience=&limit= — ranked posting slots. */
  @Get('suggestions')
  suggest(
    @Query('channel') channel: ContentChannel,
    @Query('audience') audience: Audience,
    @Query('limit') limit?: string,
  ) {
    return this.timing.suggest(channel, audience, limit ? Number(limit) : undefined);
  }

  /** POST /api/timing/outcomes — record an outcome so suggestions adapt. */
  @Post('outcomes')
  record(@Body() outcome: TimingOutcome) {
    return this.timing.recordOutcome(outcome);
  }

  /**
   * POST /api/timing/engagement — feed real engagement metrics; they're
   * normalised to a weighted signal and learned as an outcome.
   */
  @Post('engagement')
  engagement(
    @Body() body: Omit<TimingOutcome, 'signal'> & { metrics: EngagementMetrics },
  ) {
    return this.timing.recordEngagement(body);
  }
}
