import { Body, Controller, Post } from '@nestjs/common';
import { IdeasService } from './ideas.service';
import type { IdeaRequest } from './ideas.types';

@Controller('ai')
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  /** POST /ai/ideas — generate 5 RAG-grounded post ideas. */
  @Post('ideas')
  generate(@Body() request: IdeaRequest) {
    return this.ideas.generate(request);
  }
}
