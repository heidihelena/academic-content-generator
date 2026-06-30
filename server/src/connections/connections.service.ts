import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Platform } from '../domain/types';
import {
  ACCOUNTS_REPOSITORY,
  TOKEN_STORE,
  type AccountsRepository,
  type TokenStore,
} from '../persistence/repository.interfaces';

export type ConnectMethod = 'oauth' | 'app-password' | 'access-token' | 'api-key';

export interface ProviderStatus {
  /** The active provider (e.g. `mock`, `anthropic`, `elevenlabs`). */
  active: string;
  /** True when a real (non-mock) provider is configured with its key. */
  live: boolean;
}

export interface SocialStatus {
  platform: Platform;
  method: ConnectMethod;
  /** True when provider credentials/dev-app config exists, or a token is stored. */
  configured: boolean;
  /** True when this run has a connected account and stored token for publishing. */
  connected: boolean;
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
 * configured/connected, and the local input/storage paths. Reports modes and
 * booleans only — never keys, tokens or passwords.
 */
@Injectable()
export class ConnectionsService {
  constructor(
    private readonly config: ConfigService,
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepository,
    @Inject(TOKEN_STORE) private readonly tokens: TokenStore,
  ) {}

  async report(): Promise<ConnectionsReport> {
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
      social: await Promise.all([
        this.socialStatus(
          'bluesky',
          'app-password',
          has('integrations.bluesky.identifier') && has('integrations.bluesky.appPassword'),
        ),
        this.socialStatus(
          'mastodon',
          'access-token',
          has('integrations.mastodon.instance') && has('integrations.mastodon.accessToken'),
        ),
        this.socialStatus('linkedin', 'oauth', has('integrations.linkedin.clientId')),
        this.socialStatus('instagram', 'oauth', has('integrations.instagram.clientId')),
        this.socialStatus('threads', 'oauth', has('integrations.threads.clientId')),
        this.socialStatus('x', 'oauth', has('integrations.x.clientId')),
      ]),
    };
  }

  private async socialStatus(
    platform: Platform,
    method: ConnectMethod,
    configuredFromEnv: boolean,
  ): Promise<SocialStatus> {
    const [account, token] = await Promise.all([
      this.accounts.findByPlatform(platform),
      this.tokens.get(platform),
    ]);
    const connected = account?.status === 'connected' && Boolean(token);
    return {
      platform,
      method,
      configured: configuredFromEnv || connected,
      connected,
    };
  }
}
