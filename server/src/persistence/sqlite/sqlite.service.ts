import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Opens (and migrates) the SQLite database.
 *
 * better-sqlite3 and sqlite-vec are optional dependencies, loaded via dynamic
 * require so the project type-checks and runs (on the memory driver) without the
 * native module installed. Install them to use the sqlite driver:
 *
 *   npm install better-sqlite3 sqlite-vec
 */
@Injectable()
export class SqliteService implements OnModuleInit {
  private readonly logger = new Logger(SqliteService.name);
  // Typed as `any` to avoid a hard compile-time dependency on @types/better-sqlite3.
  private database: any;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const path = this.config.get<string>('persistence.sqlitePath')!;
    mkdirSync(dirname(path), { recursive: true });

    const Database = require('better-sqlite3');
    this.database = new Database(path);
    this.database.pragma('journal_mode = WAL');

    // sqlite-vec adds the vec0 virtual table for fast k-NN. Optional — the
    // VectorStore falls back to JS cosine when it's unavailable.
    try {
      require('sqlite-vec').load(this.database);
      this.logger.log('sqlite-vec extension loaded');
    } catch {
      this.logger.warn('sqlite-vec not loaded — using JS cosine fallback for vector search');
    }

    this.migrate();
  }

  get db(): any {
    if (!this.database) throw new Error('SQLite database not initialized');
    return this.database;
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_posts_due ON posts(status, scheduled_at);

      CREATE TABLE IF NOT EXISTS accounts (
        platform TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tokens (
        platform TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vault_chunks (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        hash TEXT NOT NULL,
        embedding TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_source ON vault_chunks(source);
    `);
  }
}
