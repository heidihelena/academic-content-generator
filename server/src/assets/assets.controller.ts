import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { AssetsService, AttachAssetInput } from './assets.service';

/** Media attachments, hung off the content item they belong to. */
@Controller('content-items')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  /** GET /api/content-items/:id/assets — the item's media, oldest first. */
  @Get(':id/assets')
  list(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.assets.listForItem(id, userId);
  }

  /** POST /api/content-items/:id/assets — attach an uploaded media URL. */
  @Post(':id/assets')
  attach(@CurrentUserId() userId: string, @Param('id') id: string, @Body() input: AttachAssetInput) {
    return this.assets.attach(id, input ?? ({} as AttachAssetInput), userId);
  }

  /** DELETE /api/content-items/:id/assets/:assetId — detach a media item. */
  @Delete(':id/assets/:assetId')
  async remove(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ) {
    await this.assets.remove(id, assetId, userId);
    return { ok: true };
  }
}
