import { Body, Controller, Post } from '@nestjs/common';
import { Audience, ContentChannel } from '../domain/academic';
import { RateLimited } from '../rate-limit/rate-limited.decorator';
import { DraftStudioRequest, DraftStudioService } from './draft-studio.service';
import { TransformService } from './transform.service';
import { TransformRequest } from './transform.types';

interface HookRequest {
  sourceId: string;
  channel: ContentChannel;
  audience: Audience;
}

@RateLimited()
@Controller('draft-studio')
export class DraftStudioController {
  constructor(
    private readonly studio: DraftStudioService,
    private readonly transformer: TransformService,
  ) {}

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

  /**
   * POST /api/draft-studio/transform — rewrite/translate an existing draft
   * (register-and-shape edits only; meaning and claims are preserved).
   */
  @Post('transform')
  transform(@Body() req: TransformRequest) {
    return this.transformer.transform(req);
  }
}
