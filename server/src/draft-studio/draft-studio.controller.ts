import { Body, Controller, Post } from '@nestjs/common';
import { DraftStudioRequest, DraftStudioService } from './draft-studio.service';

@Controller('draft-studio')
export class DraftStudioController {
  constructor(private readonly studio: DraftStudioService) {}

  /**
   * POST /api/draft-studio — generate a draft from a source for a channel +
   * audience and return it with its claim/safety review.
   */
  @Post()
  create(@Body() req: DraftStudioRequest) {
    return this.studio.create(req);
  }
}
