import { Body, Controller, Post } from '@nestjs/common';
import { Audience, ContentChannel } from '../domain/academic';
import { DraftStudioRequest, DraftStudioService } from './draft-studio.service';

interface HookRequest {
  sourceId: string;
  channel: ContentChannel;
  audience: Audience;
}

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

  /** POST /api/draft-studio/hook — suggest a single opening hook for a source. */
  @Post('hook')
  hook(@Body() req: HookRequest) {
    return this.studio.hook(req.sourceId, req.channel, req.audience);
  }
}
