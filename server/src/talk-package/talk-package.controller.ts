import { Body, Controller, Post } from '@nestjs/common';
import { RateLimited } from '../rate-limit/rate-limited.decorator';
import { TalkPackageRequest } from './talk-package.types';
import { TalkPackageService } from './talk-package.service';

@RateLimited()
@Controller('talk-package')
export class TalkPackageController {
  constructor(private readonly talkPackage: TalkPackageService) {}

  /**
   * POST /api/talk-package — turn a source into a long-form talk + derived
   * shorts, persisted as a campaign. Returns `{ campaign, plan, talk, shorts,
   * review, estimatedMinutes }`.
   */
  @Post()
  generate(@Body() req: TalkPackageRequest) {
    return this.talkPackage.generate(req);
  }
}
