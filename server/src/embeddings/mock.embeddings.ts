import { createHash } from 'crypto';
import type { EmbeddingsService } from './embeddings.types';

/**
 * Deterministic, offline embeddings. Hashes word tokens into a fixed-dimension
 * bag-of-words vector and L2-normalizes it. Not semantically rich, but stable
 * and dependency-free — good enough to demo and test the retrieval pipeline.
 *
 * Swap EMBEDDINGS_PROVIDER=voyage for real semantic embeddings.
 */
export class MockEmbeddingsService implements EmbeddingsService {
  constructor(public readonly dimensions: number) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedOne(t));
  }

  private embedOne(text: string): number[] {
    const vec = new Array<number>(this.dimensions).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const token of tokens) {
      const h = createHash('md5').update(token).digest();
      const bucket = h.readUInt32BE(0) % this.dimensions;
      const sign = (h[4] & 1) === 0 ? 1 : -1;
      vec[bucket] += sign;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}
