import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ContentStatus } from '../domain/academic';
import { OutputsService } from './outputs.service';

@Controller('outputs')
export class OutputsController {
  constructor(private readonly outputs: OutputsService) {}

  /** GET /api/outputs?campaignId=&sourceId= — list stored outputs, optionally filtered. */
  @Get()
  list(@Query('campaignId') campaignId?: string, @Query('sourceId') sourceId?: string) {
    return this.outputs.list({ campaignId, sourceId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.outputs.get(id);
  }

  /** PATCH /api/outputs/:id — move a piece along the editorial pipeline. */
  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body('status') status: ContentStatus) {
    return this.outputs.updateStatus(id, status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.outputs.remove(id);
    return { ok: true };
  }
}
