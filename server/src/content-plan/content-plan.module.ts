import { Module } from '@nestjs/common';
import { SourcesModule } from '../sources/sources.module';
import { ContentPlanService } from './content-plan.service';

/** Shared content-plan extractor (source → hook + points + CTA). */
@Module({
  imports: [SourcesModule],
  providers: [ContentPlanService],
  exports: [ContentPlanService],
})
export class ContentPlanModule {}
