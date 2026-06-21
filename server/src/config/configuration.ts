/**
 * Centralized, typed configuration loaded from environment variables.
 *
 * Every replaceable backend (persistence, embeddings, AI generator) is selected
 * here, so swapping mock → real is a config change, not a code change.
 */
export type PersistenceDriver = 'memory' | 'sqlite' | 'neon';
export type EmbeddingsProvider = 'mock' | 'voyage';
export type IdeaGeneratorKind = 'mock' | 'llm';

export interface AppConfig {
  port: number;
  persistence: {
    driver: PersistenceDriver;
    sqlitePath: string;
    databaseUrl?: string;
  };
  vault: {
    path: string;
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
  persistence: {
    driver: (process.env.PERSISTENCE_DRIVER as PersistenceDriver) ?? 'memory',
    sqlitePath: process.env.SQLITE_PATH ?? './data/content-calendar.sqlite',
    databaseUrl: process.env.DATABASE_URL,
  },
  vault: {
    path: process.env.VAULT_PATH ?? './vault',
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
