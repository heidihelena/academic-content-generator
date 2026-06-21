import type { EmbeddingsService } from './embeddings.types';

/**
 * Voyage AI embeddings — Anthropic's recommended embeddings provider (Anthropic
 * has no first-party embeddings endpoint).
 *
 * // --- REAL API INTEGRATION POINT -----------------------------------------
 * // Set EMBEDDINGS_PROVIDER=voyage and VOYAGE_API_KEY. Uses fetch (Node 18+),
 * // so no SDK dependency is required. Note: the configured EMBEDDING_DIMENSIONS
 * // must match the chosen Voyage model's output dimension, and your vector
 * // store column (pgvector vector(N)) must match too.
 * // ------------------------------------------------------------------------
 */
export class VoyageEmbeddingsService implements EmbeddingsService {
  constructor(
    public readonly dimensions: number,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: this.model }),
    });
    if (!res.ok) {
      throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data.map((d) => d.embedding);
  }
}
