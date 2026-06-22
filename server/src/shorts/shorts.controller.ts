import { Body, Controller, Post } from '@nestjs/common';
import { TranscriptService, type TranscriptResult } from './transcript.service';

interface FetchTranscriptDto {
  url: string;
}

@Controller('shorts')
export class ShortsController {
  constructor(private readonly transcripts: TranscriptService) {}

  /** Fetch a YouTube transcript so the Shorts planner can use it. */
  @Post('transcript')
  fetchTranscript(@Body() dto: FetchTranscriptDto): Promise<TranscriptResult> {
    return this.transcripts.fetch(dto?.url ?? '');
  }
}
