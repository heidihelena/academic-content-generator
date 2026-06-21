/**
 * Centralized, typed configuration loaded from environment variables.
 *
 * Every replaceable backend (persistence, embeddings, AI generator) is selected
 * here, so swapping mock → real is a config change, not a code change.
 */
export type PersistenceDriver = 'memory' | 'sqlite' | 'neon';
export type EmbeddingsProvider = 'mock' | 'voyage';
export type IdeaGeneratorKind = 'mock' | 'llm';
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
    anthropicApiKey?: string;
    anthropicModel: string;
  };
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
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
  },
});
