export const EMBEDDINGS_SERVICE = Symbol('EMBEDDINGS_SERVICE');

/**
 * Embedding provider contract. Implementations turn text into fixed-length
 * vectors for semantic search over the vault.
 */
export interface EmbeddingsService {
  readonly dimensions: number;
  /** Embed a batch of texts; result[i] corresponds to texts[i]. */
  embed(texts: string[]): Promise<number[][]>;
}
