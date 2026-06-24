import { Body, Controller, Post } from '@nestjs/common';
import { ReviewState } from '../domain/academic';
import { SafetyService } from './safety.service';

interface ReviewRequest {
  /** The draft text to review. */
  body: string;
}

@Controller('safety')
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  /** POST /api/safety/review — run claim + medical-safety review over a draft. */
  @Post('review')
  review(@Body() req: ReviewRequest): ReviewState {
    return this.safety.review(req?.body ?? '');
  }
}
