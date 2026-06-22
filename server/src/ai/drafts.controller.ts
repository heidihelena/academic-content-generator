import { Body, Controller, Post } from '@nestjs/common';
import { DraftsService } from './drafts.service';
import type { ShortsPlanRequest, ThreadDraftRequest } from './drafts.prompts';

@Controller('ai')
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  /** POST /ai/thread — turn an abstract into an accessible thread (LLM). */
  @Post('thread')
  thread(@Body() req: ThreadDraftRequest) {
    return this.drafts.thread(req);
  }

  /** POST /ai/shorts — plan short clips from a transcript (LLM). */
  @Post('shorts')
  shorts(@Body() req: ShortsPlanRequest) {
    return this.drafts.shorts(req);
  }
}
