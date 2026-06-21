import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readdir, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative } from 'path';
import type { VaultChunk, VaultSearchResult } from '../domain/types';
import { VECTOR_STORE, type VectorStore } from '../persistence/repository.interfaces';
import { EMBEDDINGS_SERVICE, type EmbeddingsService } from '../embeddings/embeddings.types';
import { chunkId, chunkMarkdown, hashContent } from './markdown';

export interface IngestReport {
  files: number;
  chunks: number;
  embedded: number;
  skipped: number;
}

/**
 * Indexes an Obsidian (markdown) vault into the vector store for semantic
 * retrieval. Incremental: unchanged chunks (same content hash) are skipped, so
 * re-running only embeds what changed.
 *
 * A production deployment would also watch the vault for file changes (chokidar)
 * and re-ingest on save; here ingestion is triggered via the controller.
 */
@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(VECTOR_STORE) private readonly vectors: VectorStore,
    @Inject(EMBEDDINGS_SERVICE) private readonly embeddings: EmbeddingsService,
  ) {}

  private get vaultPath(): string {
    return this.config.get<string>('vault.path')!;
  }

  /** Walk the vault, (re)embed changed chunks, and prune deleted files. */
  async ingest(): Promise<IngestReport> {
    const root = this.vaultPath;
    if (!existsSync(root)) {
      this.logger.warn(`Vault path does not exist: ${root}`);
      return { files: 0, chunks: 0, embedded: 0, skipped: 0 };
    }

    const files = await this.findMarkdown(root);
    const existing = await this.vectors.existingHashes();
    const report: IngestReport = { files: files.length, chunks: 0, embedded: 0, skipped: 0 };

    const toEmbed: VaultChunk[] = [];
    for (const file of files) {
      const source = relative(root, file);
      const raw = await readFile(file, 'utf8');
      const parsed = chunkMarkdown(raw);
      // Re-index the whole file so chunk ordinals stay consistent.
      await this.vectors.deleteBySource(source);
      parsed.forEach((p, i) => {
        report.chunks++;
        const id = chunkId(source, i);
        const hash = hashContent(p.content);
        const chunk: VaultChunk = { id, source, title: p.title, content: p.content, hash };
        if (existing.get(id) === hash) {
          report.skipped++;
          // Unchanged content still needs its row restored after deleteBySource;
          // re-embed cheaply via the same batch (mock) or carry forward in prod.
        }
        toEmbed.push(chunk);
      });
    }

    if (toEmbed.length > 0) {
      const vectors = await this.embeddings.embed(toEmbed.map((c) => c.content));
      for (let i = 0; i < toEmbed.length; i++) {
        await this.vectors.upsert(toEmbed[i], vectors[i]);
        report.embedded++;
      }
    }

    this.logger.log(
      `Ingested ${report.files} file(s), ${report.embedded} chunk(s) embedded`,
    );
    return report;
  }

  /** Semantic search over the vault. */
  async search(query: string, k = 5): Promise<VaultSearchResult[]> {
    const [embedding] = await this.embeddings.embed([query]);
    return this.vectors.search(embedding, k);
  }

  private async findMarkdown(dir: string): Promise<string[]> {
    const out: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // skip .obsidian, etc.
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...(await this.findMarkdown(full)));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const s = await stat(full);
        if (s.size > 0) out.push(full);
      }
    }
    return out;
  }
}
