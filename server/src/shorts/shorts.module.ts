import { Module } from '@nestjs/common';
import { ShortsController } from './shorts.controller';
import { TranscriptService } from './transcript.service';

@Module({
  controllers: [ShortsController],
  providers: [TranscriptService],
})
export class ShortsModule {}
