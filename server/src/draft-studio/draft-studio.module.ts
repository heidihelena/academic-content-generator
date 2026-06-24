import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OutputsModule } from '../outputs/outputs.module';
import { SafetyModule } from '../safety/safety.module';
import { SourcesModule } from '../sources/sources.module';
import { DraftStudioController } from './draft-studio.controller';
import { DraftStudioService } from './draft-studio.service';
import { DRAFT_COMPOSER, type DraftComposer } from './composer.types';
import { LocalDraftComposer } from './local.composer';
import { LlmDraftComposer } from './llm.composer';

/** Draft Studio workflow (ForskAI Version 1, issue #35). */
@Module({
  imports: [OutputsModule, SafetyModule, SourcesModule, ConfigModule],
  providers: [
    DraftStudioService,
    {
      // Claude-backed composer when configured, deterministic local otherwise —
      // the same swap-by-config pattern as the idea generator.
      provide: DRAFT_COMPOSER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DraftComposer => {
        if (config.get<string>('ai.generator') === 'llm') {
          const key = config.get<string>('ai.anthropicApiKey');
          if (key) {
            return new LlmDraftComposer(
              key,
              config.get<string>('ai.anthropicModel') ?? 'claude-opus-4-8',
            );
          }
        }
        return new LocalDraftComposer();
      },
    },
  ],
  controllers: [DraftStudioController],
  exports: [DraftStudioService],
})
export class DraftStudioModule {}
