import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ContentPlanModule } from '../content-plan/content-plan.module';
import { OutputsModule } from '../outputs/outputs.module';
import { SafetyModule } from '../safety/safety.module';
import { LlmTalkComposer } from './llm.talk-composer';
import { LocalTalkComposer } from './local.talk-composer';
import { TALK_COMPOSER, type TalkComposer } from './talk-composer.types';
import { TalkPackageController } from './talk-package.controller';
import { TalkPackageService } from './talk-package.service';

/** Talk-package generator (source → long-form talk + derived shorts as a campaign). */
@Module({
  imports: [ContentPlanModule, CampaignsModule, OutputsModule, SafetyModule, ConfigModule],
  providers: [
    TalkPackageService,
    {
      // Claude-backed prose when configured, deterministic local scaffold
      // otherwise — the same swap-by-config pattern as the draft composer.
      provide: TALK_COMPOSER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TalkComposer => {
        if (config.get<string>('ai.generator') === 'llm') {
          const key = config.get<string>('ai.anthropicApiKey');
          if (key) {
            return new LlmTalkComposer(
              key,
              config.get<string>('ai.anthropicModel') ?? 'claude-opus-4-8',
            );
          }
        }
        return new LocalTalkComposer();
      },
    },
  ],
  controllers: [TalkPackageController],
  exports: [TalkPackageService],
})
export class TalkPackageModule {}
