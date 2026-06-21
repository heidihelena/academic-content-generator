import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VaultModule } from '../vault/vault.module';
import { IdeasService } from './ideas.service';
import { IdeasController } from './ideas.controller';
import { IDEA_GENERATOR, type IdeaGenerator } from './ideas.types';
import { MockIdeaGenerator } from './generators/mock.generator';
import { LlmIdeaGenerator } from './generators/llm.generator';

@Module({
  imports: [ConfigModule, VaultModule],
  providers: [
    IdeasService,
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
  controllers: [IdeasController],
})
export class AiModule {}
