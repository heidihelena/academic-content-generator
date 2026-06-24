import { Body, Controller, Post } from '@nestjs/common';
import { AUDIENCES, Audience, ReviewState } from '../domain/academic';
import { SafetyService } from './safety.service';

interface ReviewRequest {
  /** The draft text to review. */
  body: string;
  /** Optional audience — patient-facing audiences get stricter (escalated) review. */
  audience?: Audience;
}

@Controller('safety')
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  /** POST /api/safety/review — run claim + medical-safety review over a draft. */
  @Post('review')
  review(@Body() req: ReviewRequest): ReviewState {
    const audience = req?.audience && AUDIENCES.includes(req.audience) ? req.audience : undefined;
    return this.safety.review(req?.body ?? '', new Date(), audience);
  }
}
