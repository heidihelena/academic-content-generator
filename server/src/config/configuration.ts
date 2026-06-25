/**
 * Centralized, typed configuration loaded from environment variables.
 *
 * Every replaceable backend (persistence, embeddings, AI generator) is selected
 * here, so swapping mock → real is a config change, not a code change.
 */
export type PersistenceDriver = 'memory' | 'sqlite' | 'neon';
export type EmbeddingsProvider = 'mock' | 'voyage';
export type IdeaGeneratorKind = 'mock' | 'llm';
export type LlmProvider = 'anthropic' | 'ollama';
export type StorageDriver = 'local' | 's3';

/** Per-platform OAuth app credentials. When absent, the platform falls back to
 *  the mock integration so the demo still works. */
export interface PlatformCredentials {
  clientId?: string;
  clientSecret?: string;
}

export interface AppConfig {
  port: number;
  frontendUrl?: string;
  persistence: {
    driver: PersistenceDriver;
    sqlitePath: string;
    databaseUrl?: string;
  };
  integrations: {
    instagram: PlatformCredentials;
    linkedin: PlatformCredentials & { version: string };
    threads: PlatformCredentials;
    /** Bluesky uses an app password (AT Protocol), not OAuth client creds. */
    bluesky: { service: string; identifier?: string; appPassword?: string };
    /** Mastodon uses a per-instance access token, not OAuth client creds. */
    mastodon: { instance?: string; accessToken?: string };
  };
  vault: {
    path: string;
    watch: boolean;
  };
  storage: {
    driver: StorageDriver;
    uploadsDir: string;
    /** Public base URL used to build media URLs (must be reachable by the
     *  platforms when publishing real posts). */
    publicBaseUrl: string;
    s3: { bucket?: string; region?: string; publicBaseUrl?: string };
  };
  embeddings: {
    provider: EmbeddingsProvider;
    dimensions: number;
    voyageApiKey?: string;
    voyageModel: string;
  };
  ai: {
    generator: IdeaGeneratorKind;
    /** Which LLM backend to use when `generator==='llm'`. */
    provider: LlmProvider;
    anthropicApiKey?: string;
    anthropicModel: string;
    /** Ollama (local LLM) connection, used when `provider==='ollama'`. */
    ollamaBaseUrl: string;
    ollamaModel: string;
  };
  auth: {
    /** Off by default (local-first): the API is open and every request is the
     *  single implicit local user. Turn on to require a bearer token. */
    enabled: boolean;
    /** Shared bearer token required when `enabled`. Resolves to `defaultUserId`.
     *  If `enabled` is true but no token (single or per-user) is set, auth stays
     *  open (fails safe) with a startup warning. */
    token?: string;
    /** Per-user tokens (multi-user) parsed from `AUTH_TOKENS` ("alice:tokA,bob:tokB").
     *  A matching token resolves the request to that user id, scoping their
     *  content (ContentItem.ownerId). */
    tokens: Record<string, string>;
    /** Identity for the shared token / the open default — the seam per-user
     *  accounts plug into. */
    defaultUserId: string;
  };
}

/** Parse `AUTH_TOKENS` ("alice:tokA,bob:tokB") into a `{ userId: token }` map. */
function parseAuthTokens(raw?: string): Record<string, string> {
  if (!raw) return {};
  const map: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf(':');
    if (idx <= 0) continue;
    const userId = pair.slice(0, idx).trim();
    const token = pair.slice(idx + 1).trim();
    if (userId && token) map[userId] = token;
  }
  return map;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL,
  persistence: {
    driver: (process.env.PERSISTENCE_DRIVER as PersistenceDriver) ?? 'memory',
    sqlitePath: process.env.SQLITE_PATH ?? './data/content-calendar.sqlite',
    databaseUrl: process.env.DATABASE_URL,
  },
  integrations: {
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      version: process.env.LINKEDIN_VERSION ?? '202401',
    },
    threads: {
      clientId: process.env.THREADS_CLIENT_ID,
      clientSecret: process.env.THREADS_CLIENT_SECRET,
    },
    bluesky: {
      service: process.env.BLUESKY_SERVICE ?? 'https://bsky.social',
      identifier: process.env.BLUESKY_IDENTIFIER,
      appPassword: process.env.BLUESKY_APP_PASSWORD,
    },
    mastodon: {
      instance: process.env.MASTODON_INSTANCE,
      accessToken: process.env.MASTODON_ACCESS_TOKEN,
    },
  },
  vault: {
    path: process.env.VAULT_PATH ?? './vault',
    watch: process.env.VAULT_WATCH === 'true',
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER as StorageDriver) ?? 'local',
    uploadsDir: process.env.UPLOADS_DIR ?? './data/uploads',
    publicBaseUrl:
      process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`,
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
    },
  },
  embeddings: {
    provider: (process.env.EMBEDDINGS_PROVIDER as EmbeddingsProvider) ?? 'mock',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS ?? '256', 10),
    voyageApiKey: process.env.VOYAGE_API_KEY,
    voyageModel: process.env.VOYAGE_MODEL ?? 'voyage-3',
  },
  ai: {
    generator: (process.env.IDEA_GENERATOR as IdeaGeneratorKind) ?? 'mock',
    provider: (process.env.LLM_PROVIDER as LlmProvider) ?? 'anthropic',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL ?? 'llama3.1',
  },
  auth: {
    enabled: process.env.AUTH_ENABLED === 'true',
    token: process.env.AUTH_TOKEN,
    tokens: parseAuthTokens(process.env.AUTH_TOKENS),
    defaultUserId: process.env.AUTH_DEFAULT_USER_ID ?? 'local',
  },
});
