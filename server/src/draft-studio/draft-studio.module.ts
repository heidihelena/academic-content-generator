import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { SafetyModule } from '../safety/safety.module';
import { SourcesModule } from '../sources/sources.module';
import { DraftStudioController } from './draft-studio.controller';
import { DraftStudioService } from './draft-studio.service';
import { createLlmClient } from '../ai/llm-client';
import { DRAFT_COMPOSER, type DraftComposer } from './composer.types';
import { LocalDraftComposer } from './local.composer';
import { LlmDraftComposer } from './llm.composer';

/** Draft Studio workflow (ForskAI Version 1, issue #35). */
@Module({
  imports: [ContentModule, SafetyModule, SourcesModule, ConfigModule],
  providers: [
    DraftStudioService,
    {
      // LLM-backed composer when configured (Claude or a local Ollama model),
      // deterministic local otherwise — the same swap-by-config pattern as the
      // idea generator.
      provide: DRAFT_COMPOSER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DraftComposer => {
        if (config.get<string>('ai.generator') === 'llm') {
          const client = createLlmClient({
            provider: config.get<string>('ai.provider') ?? 'anthropic',
            anthropicApiKey: config.get<string>('ai.anthropicApiKey'),
            anthropicModel: config.get<string>('ai.anthropicModel') ?? 'claude-opus-4-8',
            ollamaBaseUrl: config.get<string>('ai.ollamaBaseUrl') ?? 'http://localhost:11434',
            ollamaModel: config.get<string>('ai.ollamaModel') ?? 'llama3.1',
          });
          if (client) return new LlmDraftComposer(client);
        }
        return new LocalDraftComposer();
      },
    },
  ],
  controllers: [DraftStudioController],
  exports: [DraftStudioService],
})
export class DraftStudioModule {}
