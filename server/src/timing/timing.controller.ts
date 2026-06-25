import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Audience, ContentChannel } from '../domain/academic';
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
}
