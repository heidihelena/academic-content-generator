import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { ChecklistService } from './checklist.service';

/** Pre-publish checklist, hung off the content item it belongs to. */
@Controller('content-items')
export class ChecklistController {
  constructor(private readonly checklist: ChecklistService) {}

  /** GET /api/content-items/:id/checklist — the item's checklist, oldest first. */
  @Get(':id/checklist')
  list(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.checklist.listForItem(id, userId);
  }

  /** POST /api/content-items/:id/checklist — add an entry. */
  @Post(':id/checklist')
  add(@CurrentUserId() userId: string, @Param('id') id: string, @Body('label') label: string) {
    return this.checklist.add(id, label, userId);
  }

  /** PATCH /api/content-items/:id/checklist/:checkId — set the done flag. */
  @Patch(':id/checklist/:checkId')
  setDone(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('checkId') checkId: string,
    @Body('done') done: boolean,
  ) {
    return this.checklist.setDone(id, checkId, Boolean(done), userId);
  }

  /** DELETE /api/content-items/:id/checklist/:checkId — remove an entry. */
  @Delete(':id/checklist/:checkId')
  async remove(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('checkId') checkId: string,
  ) {
    await this.checklist.remove(id, checkId, userId);
    return { ok: true };
  }
}
