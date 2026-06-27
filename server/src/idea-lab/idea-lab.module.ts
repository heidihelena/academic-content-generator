import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SourcesModule } from '../sources/sources.module';
import { IdeaLabController } from './idea-lab.controller';
import { IdeaLabService } from './idea-lab.service';

/** Academic Idea Lab (forskai Version 1, issue #29). */
@Module({
  imports: [AiModule, SourcesModule],
  providers: [IdeaLabService],
  controllers: [IdeaLabController],
  exports: [IdeaLabService],
})
export class IdeaLabModule {}
