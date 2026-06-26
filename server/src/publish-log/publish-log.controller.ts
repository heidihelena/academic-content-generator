import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PublishLogService, RecordPublishInput } from './publish-log.service';

/** Manual-publish audit trail, hung off the variant it records. */
@Controller('content-variants')
export class PublishLogController {
  constructor(private readonly publishLog: PublishLogService) {}

  /** GET /api/content-variants/:id/publish-log — where/when this variant went live. */
  @Get(':id/publish-log')
  list(@Param('id') id: string) {
    return this.publishLog.listForVariant(id);
  }

  /** POST /api/content-variants/:id/publish-log — record a manual publish. */
  @Post(':id/publish-log')
  record(@Param('id') id: string, @Body() input: RecordPublishInput) {
    return this.publishLog.record(id, input ?? {});
  }
}
