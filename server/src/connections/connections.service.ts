import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ConnectMethod = 'oauth' | 'app-password' | 'access-token' | 'api-key';

export interface ProviderStatus {
  /** The active provider (e.g. `mock`, `anthropic`, `elevenlabs`). */
  active: string;
  /** True when a real (non-mock) provider is configured with its key. */
  live: boolean;
}

export interface SocialStatus {
  platform: string;
  method: ConnectMethod;
  /** True when the credentials needed to connect for real are present. */
  configured: boolean;
}

export interface ConnectionsReport {
  /** Local inputs/storage (the academic's iCloud paths on a local Mac run). */
  inputs: {
    vaultPath: string;
    persistenceDriver: string;
    sqlitePath: string;
  };
  /** Content-generation backends — modes only, never secrets. */
  providers: {
    llm: ProviderStatus;
    voice: ProviderStatus;
    video: ProviderStatus;
    embeddings: ProviderStatus;
  };
  /** Publishing destinations and how each is connected. */
  social: SocialStatus[];
}

/**
 * A secret-safe snapshot of every connection for the in-app Connections panel:
 * which content providers are live vs mock, which social platforms are
 * configured, and the local input/storage paths. Reports modes and booleans
 * only — never keys, tokens or passwords.
 */
@Injectable()
export class ConnectionsService {
  constructor(private readonly config: ConfigService) {}

  report(): ConnectionsReport {
    const has = (path: string) => Boolean(this.config.get<string>(path));

    const generator = this.config.get<string>('ai.generator') ?? 'mock';
    const llmProvider = this.config.get<string>('ai.provider') ?? 'anthropic';
    const llmLive =
      generator === 'llm' &&
      (llmProvider === 'ollama' || (llmProvider === 'anthropic' && has('ai.anthropicApiKey')));

    const voiceProvider = this.config.get<string>('media.voice.provider') ?? 'mock';
    const videoProvider = this.config.get<string>('media.video.provider') ?? 'mock';
    const embeddings = this.config.get<string>('embeddings.provider') ?? 'mock';

    return {
      inputs: {
        vaultPath: this.config.get<string>('vault.path') ?? './vault',
        persistenceDriver: this.config.get<string>('persistence.driver') ?? 'memory',
        sqlitePath: this.config.get<string>('persistence.sqlitePath') ?? '',
      },
      providers: {
        llm: { active: generator === 'llm' ? llmProvider : 'mock', live: llmLive },
        voice: {
          active: voiceProvider,
          live: voiceProvider === 'elevenlabs' && has('media.voice.elevenLabsApiKey'),
        },
        video: {
          active: videoProvider,
          live: videoProvider === 'heygen' && has('media.video.heygenApiKey'),
        },
        embeddings: { active: embeddings, live: embeddings !== 'mock' && has('embeddings.voyageApiKey') },
      },
      social: [
        {
          platform: 'bluesky',
          method: 'app-password',
          configured: has('integrations.bluesky.identifier') && has('integrations.bluesky.appPassword'),
        },
        {
          platform: 'mastodon',
          method: 'access-token',
          configured: has('integrations.mastodon.instance') && has('integrations.mastodon.accessToken'),
        },
        { platform: 'linkedin', method: 'oauth', configured: has('integrations.linkedin.clientId') },
        { platform: 'instagram', method: 'oauth', configured: has('integrations.instagram.clientId') },
        { platform: 'threads', method: 'oauth', configured: has('integrations.threads.clientId') },
        { platform: 'x', method: 'oauth', configured: has('integrations.x.clientId') },
      ],
    };
  }
}
