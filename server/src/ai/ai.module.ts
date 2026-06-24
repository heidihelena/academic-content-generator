import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VaultModule } from '../vault/vault.module';
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
      provide: IDEA_GENERATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService): IdeaGenerator => {
        if (config.get<string>('ai.generator') === 'llm') {
          const key = config.get<string>('ai.anthropicApiKey');
          if (!key) throw new Error('ANTHROPIC_API_KEY is required for the llm generator');
          return new LlmIdeaGenerator(key, config.get<string>('ai.anthropicModel')!);
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
