import { Body, Controller, Post } from '@nestjs/common';
import { RateLimited } from '../rate-limit/rate-limited.decorator';
import { IdeasService } from './ideas.service';
import type { IdeaRequest } from './ideas.types';

@RateLimited()
@Controller('ai')
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  /** POST /ai/ideas — generate 5 RAG-grounded post ideas. */
  @Post('ideas')
  generate(@Body() request: IdeaRequest) {
    return this.ideas.generate(request);
  }
}
