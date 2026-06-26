import { Body, Controller, Post } from '@nestjs/common';
import { Audience } from '../domain/academic';
import { RateLimited } from '../rate-limit/rate-limited.decorator';
import { IdeaLabService } from './idea-lab.service';

interface IdeaLabRequest {
  sourceId: string;
  /** Optional target audience; defaults to `peers`. */
  audience?: Audience;
}

@RateLimited()
@Controller('idea-lab')
export class IdeaLabController {
  constructor(private readonly ideaLab: IdeaLabService) {}

  /** POST /api/idea-lab — generate 5 academic content ideas from a source. */
  @Post()
  generate(@Body() req: IdeaLabRequest) {
    return this.ideaLab.generate(req.sourceId, req.audience);
  }
}
