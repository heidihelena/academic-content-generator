import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { SafetyModule } from '../safety/safety.module';
import { SourcesModule } from '../sources/sources.module';
import { DraftStudioController } from './draft-studio.controller';
import { DraftStudioService } from './draft-studio.service';
import { LlmClient, createLlmClient } from '../ai/llm-client';
import { DRAFT_COMPOSER, type DraftComposer } from './composer.types';
import { LocalDraftComposer } from './local.composer';
import { LlmDraftComposer } from './llm.composer';
import { AgenticDraftComposer } from './agentic.composer';
import { TransformService } from './transform.service';

/** The configured LLM client, or `null` when none is usable (→ local impls). */
function llmClientFromConfig(config: ConfigService): LlmClient | null {
  if (config.get<string>('ai.generator') !== 'llm') return null;
  return createLlmClient({
    provider: config.get<string>('ai.provider') ?? 'anthropic',
    anthropicApiKey: config.get<string>('ai.anthropicApiKey'),
    anthropicModel: config.get<string>('ai.anthropicModel') ?? 'claude-opus-4-8',
    ollamaBaseUrl: config.get<string>('ai.ollamaBaseUrl') ?? 'http://localhost:11434',
    ollamaModel: config.get<string>('ai.ollamaModel') ?? 'llama3.1',
  });
}

/** Draft Studio workflow (forskai Version 1, issue #35). */
@Module({
  imports: [ContentModule, SafetyModule, SourcesModule, ConfigModule],
  providers: [
    DraftStudioService,
    {
      // LLM-backed composer when configured (Claude or a local Ollama model),
      // deterministic local otherwise — the same swap-by-config pattern as the
      // idea generator. COMPOSER_MODE=agentic wraps the LLM composer in a
      // bounded compose → safety-review → revise loop.
      provide: DRAFT_COMPOSER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DraftComposer => {
        const client = llmClientFromConfig(config);
        if (!client) return new LocalDraftComposer();
        return config.get<string>('ai.composerMode') === 'agentic'
          ? new AgenticDraftComposer(client)
          : new LlmDraftComposer(client);
      },
    },
    {
      // Draft transform (rewrite / translate): LLM-backed when configured,
      // deterministic local fallback otherwise.
      provide: TransformService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TransformService =>
        new TransformService(llmClientFromConfig(config)),
    },
  ],
  controllers: [DraftStudioController],
  exports: [DraftStudioService],
})
export class DraftStudioModule {}
