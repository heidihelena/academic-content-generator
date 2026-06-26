import { Controller, Get, Inject, Param, forwardRef } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { ContentService } from '../content/content.service';
import { StatusHistoryService } from './status-history.service';

/** Variant approval-workflow audit trail, hung off the variant it records. */
@Controller('content-variants')
export class StatusHistoryController {
  constructor(
    private readonly history: StatusHistoryService,
    // forwardRef: ContentModule ⇄ StatusHistoryModule import each other.
    @Inject(forwardRef(() => ContentService)) private readonly content: ContentService,
  ) {}

  /** GET /api/content-variants/:id/status-history — lifecycle transitions, oldest first.
   *  Scoped to the variant's owner (via the parent item). */
  @Get(':id/status-history')
  async list(@CurrentUserId() userId: string, @Param('id') id: string) {
    await this.content.getVariant(id, userId); // 404 if missing or not owned
    return this.history.listForVariant(id);
  }
}
