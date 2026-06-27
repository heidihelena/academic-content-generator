import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { CollectionStore, Identified } from './json-file.store';

/**
 * A durable {@link CollectionStore} backed by a SQLite table — one row per item,
 * `(id TEXT PRIMARY KEY, data TEXT)` with the domain object stored as JSON. It
 * mirrors {@link JsonFileStore}'s synchronous API exactly, so a repository swaps
 * from a JSON file to SQLite purely by configuration.
 *
 * Unlike the JSON file store it doesn't rewrite the whole collection per change,
 * so it scales to the growing collections (timing slots, content variants) of a
 * real hub, and WAL mode makes concurrent reads/writes safe.
 *
 * better-sqlite3 is an optional native dependency, loaded via dynamic require so
 * the project type-checks and runs (on the memory/file drivers) without it. It
 * is only constructed when PERSISTENCE_DRIVER=sqlite.
 */

// One connection per database file, shared across the tables (collections) that
// live in it, so content items, variants and timing slots reuse one handle.
const connections = new Map<string, unknown>();

function openDatabase(path: string): { prepare(sql: string): Statement; pragma(s: string): void } {
  const cached = connections.get(path);
  if (cached) return cached as never;
  mkdirSync(dirname(path), { recursive: true });
  const Database = require('better-sqlite3');
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  connections.set(path, db);
  return db;
}

interface Statement {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): { data: string } | undefined;
  all(...params: unknown[]): Array<{ data: string }>;
}

// Table name is internal (a fixed collection key), but validate it anyway since
// it can't be parameterised in DDL — defence in depth against an accidental
// injection if a caller ever derives it from input.
const SAFE_TABLE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class SqliteJsonStore<T extends Identified> implements CollectionStore<T> {
  private readonly db: ReturnType<typeof openDatabase>;

  constructor(
    path: string,
    private readonly table: string,
  ) {
    if (!SAFE_TABLE.test(table)) throw new Error(`Invalid SQLite table name: ${table}`);
    this.db = openDatabase(path);
    this.db
      .prepare(`CREATE TABLE IF NOT EXISTS "${table}" (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
      .run();
  }

  list(): T[] {
    return this.db
      .prepare(`SELECT data FROM "${this.table}"`)
      .all()
      .map((row) => JSON.parse(row.data) as T);
  }

  get(id: string): T | undefined {
    const row = this.db.prepare(`SELECT data FROM "${this.table}" WHERE id = ?`).get(id);
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  upsert(item: T): T {
    this.db
      .prepare(
        `INSERT INTO "${this.table}" (id, data) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
      )
      .run(item.id, JSON.stringify(item));
    return item;
  }

  delete(id: string): void {
    this.db.prepare(`DELETE FROM "${this.table}" WHERE id = ?`).run(id);
  }
}
