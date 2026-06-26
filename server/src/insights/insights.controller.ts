import { Controller, Get } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { InsightsReport, InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  /** GET /api/insights — derived editorial nudges for the current user's content. */
  @Get()
  report(@CurrentUserId() userId: string): Promise<InsightsReport> {
    return this.insights.report(userId);
  }
}
