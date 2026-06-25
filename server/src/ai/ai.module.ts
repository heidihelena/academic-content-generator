import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VaultModule } from '../vault/vault.module';
import { createLlmClient } from './llm-client';
import { IdeasService } from './ideas.service';
import { IdeasController } from './ideas.controller';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';
import { IDEA_GENERATOR, type IdeaGenerator } from './ideas.types';
import { MockIdeaGenerator } from './generators/mock.generator';
import { LlmIdeaGenerator } from './generators/llm.generator';

@Module({
  imports: [ConfigModule, VaultModule],
  providers: [
    IdeasService,
    DraftsService,
    {
      // LLM-backed generator when configured (Claude or a local Ollama model),
      // deterministic mock otherwise — the same swap-by-config pattern as the
      // draft and talk composers.
      provide: IDEA_GENERATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService): IdeaGenerator => {
        if (config.get<string>('ai.generator') === 'llm') {
          const client = createLlmClient({
            provider: config.get<string>('ai.provider') ?? 'anthropic',
            anthropicApiKey: config.get<string>('ai.anthropicApiKey'),
            anthropicModel: config.get<string>('ai.anthropicModel') ?? 'claude-opus-4-8',
            ollamaBaseUrl: config.get<string>('ai.ollamaBaseUrl') ?? 'http://localhost:11434',
            ollamaModel: config.get<string>('ai.ollamaModel') ?? 'llama3.1',
          });
          if (client) return new LlmIdeaGenerator(client);
        }
        return new MockIdeaGenerator();
      },
    },
  ],
  controllers: [IdeasController, DraftsController],
  // Exported so other features (e.g. the Idea Lab) can compose the configured
  // generator without re-declaring the mock/llm selection factory.
  exports: [IDEA_GENERATOR],
})
export class AiModule {}
