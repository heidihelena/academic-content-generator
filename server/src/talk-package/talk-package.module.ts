import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createLlmClient } from '../ai/llm-client';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ContentModule } from '../content/content.module';
import { ContentPlanModule } from '../content-plan/content-plan.module';
import { ReuseModule } from '../reuse/reuse.module';
import { SafetyModule } from '../safety/safety.module';
import { LlmTalkComposer } from './llm.talk-composer';
import { LocalTalkComposer } from './local.talk-composer';
import { TALK_COMPOSER, type TalkComposer } from './talk-composer.types';
import { TalkPackageController } from './talk-package.controller';
import { TalkPackageService } from './talk-package.service';

/** Talk-package generator (source → long-form talk + derived shorts as a campaign). */
@Module({
  imports: [ContentPlanModule, CampaignsModule, ContentModule, ReuseModule, SafetyModule, ConfigModule],
  providers: [
    TalkPackageService,
    {
      // LLM-backed prose when configured (Claude or a local Ollama model),
      // deterministic local scaffold otherwise — the same swap-by-config
      // pattern as the draft composer.
      provide: TALK_COMPOSER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TalkComposer => {
        if (config.get<string>('ai.generator') === 'llm') {
          const client = createLlmClient({
            provider: config.get<string>('ai.provider') ?? 'anthropic',
            anthropicApiKey: config.get<string>('ai.anthropicApiKey'),
            anthropicModel: config.get<string>('ai.anthropicModel') ?? 'claude-opus-4-8',
            ollamaBaseUrl: config.get<string>('ai.ollamaBaseUrl') ?? 'http://localhost:11434',
            ollamaModel: config.get<string>('ai.ollamaModel') ?? 'llama3.1',
          });
          if (client) return new LlmTalkComposer(client);
        }
        return new LocalTalkComposer();
      },
    },
  ],
  controllers: [TalkPackageController],
  exports: [TalkPackageService],
})
export class TalkPackageModule {}
