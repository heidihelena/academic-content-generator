import { Module } from '@nestjs/common';
import { SafetyModule } from '../safety/safety.module';
import { SourcesModule } from '../sources/sources.module';
import { DraftStudioController } from './draft-studio.controller';
import { DraftStudioService } from './draft-studio.service';

/** Draft Studio workflow (ForskAI Version 1, issue #35). */
@Module({
  imports: [SafetyModule, SourcesModule],
  providers: [DraftStudioService],
  controllers: [DraftStudioController],
  exports: [DraftStudioService],
})
export class DraftStudioModule {}
