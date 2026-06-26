import { Controller, Get, Param } from '@nestjs/common';
import { StatusHistoryService } from './status-history.service';

/** Variant approval-workflow audit trail, hung off the variant it records. */
@Controller('content-variants')
export class StatusHistoryController {
  constructor(private readonly history: StatusHistoryService) {}

  /** GET /api/content-variants/:id/status-history — lifecycle transitions, oldest first. */
  @Get(':id/status-history')
  list(@Param('id') id: string) {
    return this.history.listForVariant(id);
  }
}
