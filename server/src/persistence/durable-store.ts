import { CollectionStore, Identified, JsonFileStore } from './json-file.store';
import { SqliteJsonStore } from './sqlite-json.store';

export interface DurableStoreOptions {
  /** The configured persistence driver (already known to be non-`memory`). */
  driver: string;
  /** JSON-file path used by the `file`/`neon` drivers. */
  filePath: string;
  /** SQLite database file shared across collections (the `sqlite` driver). */
  sqlitePath: string;
  /** Table name for this collection inside the SQLite database. */
  table: string;
}

/**
 * Build the durable {@link CollectionStore} for a non-`memory` driver:
 * SQLite when `driver==='sqlite'`, a JSON file otherwise (`file`/`neon`). Lets
 * every repository select its backing store the same way — swap by config, not
 * by code.
 */
export function createDurableStore<T extends Identified>(
  opts: DurableStoreOptions,
): CollectionStore<T> {
  if (opts.driver === 'sqlite') return new SqliteJsonStore<T>(opts.sqlitePath, opts.table);
  return new JsonFileStore<T>(opts.filePath);
}
