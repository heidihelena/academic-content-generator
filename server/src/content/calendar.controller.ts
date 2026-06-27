import { Controller, Get } from '@nestjs/common';
import { ContentService } from './content.service';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly content: ContentService) {}

  /** GET /api/calendar/content — scheduled variants (with item context) for the
   *  calendar, scoped to the current user so feeds never leak across owners. */
  @Get('content')
  feed(@CurrentUserId() userId: string) {
    return this.content.scheduledFeed(userId);
  }
}
