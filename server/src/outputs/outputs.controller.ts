import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
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

  /** POST /api/outputs/:id/schedule — set a date and move to `scheduled`. */
  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body('scheduledFor') scheduledFor: string) {
    return this.outputs.schedule(id, scheduledFor);
  }

  /** POST /api/outputs/:id/publish — export the piece (gated by the safety review). */
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.outputs.export(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.outputs.remove(id);
    return { ok: true };
  }
}
