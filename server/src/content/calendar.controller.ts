import { Controller, Get } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly content: ContentService) {}

  /** GET /api/calendar/content — scheduled variants (with item context) for the calendar. */
  @Get('content')
  feed() {
    return this.content.scheduledFeed();
  }
}
