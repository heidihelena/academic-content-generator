import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Postgres connection + migrations for the Neon driver.
 *
 * `pg` is an optional dependency loaded via dynamic require (typed `any`) so the
 * project compiles without it. Install to use the neon driver:
 *
 *   npm install pg
 *
 * Neon (or any Postgres) must have pgvector enabled. This service runs
 * `CREATE EXTENSION IF NOT EXISTS vector` on boot. With one database you get
 * BOTH the operational store (posts/accounts/tokens) AND the embeddings.
 */
@Injectable()
export class PgService implements OnModuleInit {
  private readonly logger = new Logger(PgService.name);
  private poolInstance: any;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const connectionString = this.config.get<string>('persistence.databaseUrl');
    if (!connectionString) throw new Error('DATABASE_URL is required for the neon driver');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg');
    // Neon (and most hosted Postgres) require TLS — detected via `sslmode=require`
    // in the URL. Local/docker Postgres typically has no TLS, so disable it there.
    const ssl = /sslmode=require/.test(connectionString) ? { rejectUnauthorized: false } : false;
    this.poolInstance = new Pool({ connectionString, ssl });

    const dim = this.config.get<number>('embeddings.dimensions')!;
    await this.migrate(dim);
    this.logger.log('Postgres (pgvector) ready');
  }

  get pool(): any {
    if (!this.poolInstance) throw new Error('Postgres pool not initialized');
    return this.poolInstance;
  }

  query(text: string, params?: unknown[]): Promise<any> {
    return this.pool.query(text, params);
  }

  private async migrate(dimensions: number): Promise<void> {
    await this.query('CREATE EXTENSION IF NOT EXISTS vector');
    await this.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL
      )`);
    await this.query('CREATE INDEX IF NOT EXISTS idx_posts_due ON posts(status, scheduled_at)');
    await this.query('CREATE TABLE IF NOT EXISTS accounts (platform TEXT PRIMARY KEY, data JSONB NOT NULL)');
    await this.query('CREATE TABLE IF NOT EXISTS tokens (platform TEXT PRIMARY KEY, data JSONB NOT NULL)');
    await this.query(`
      CREATE TABLE IF NOT EXISTS vault_chunks (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        hash TEXT NOT NULL,
        embedding vector(${dimensions})
      )`);
    await this.query('CREATE INDEX IF NOT EXISTS idx_chunks_source ON vault_chunks(source)');
    // For large vaults add an ANN index, e.g.:
    //   CREATE INDEX ON vault_chunks USING hnsw (embedding vector_cosine_ops);
  }
}
