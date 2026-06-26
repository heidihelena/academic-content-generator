import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PublishLogService, RecordPublishInput } from './publish-log.service';

/** Manual-publish audit trail, hung off the variant it records. */
@Controller('content-variants')
export class PublishLogController {
  constructor(private readonly publishLog: PublishLogService) {}

  /** GET /api/content-variants/:id/publish-log — where/when this variant went live. */
  @Get(':id/publish-log')
  list(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.publishLog.listForVariant(id, userId);
  }

  /** POST /api/content-variants/:id/publish-log — record a manual publish. */
  @Post(':id/publish-log')
  record(@CurrentUserId() userId: string, @Param('id') id: string, @Body() input: RecordPublishInput) {
    return this.publishLog.record(id, input ?? {}, undefined, userId);
  }
}
