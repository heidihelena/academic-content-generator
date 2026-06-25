import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export interface Identified {
  id: string;
}

/**
 * A small, durable collection keyed by `id`. Implemented by {@link JsonFileStore}
 * (a JSON file, zero native deps) and `SqliteJsonStore` (a SQLite table), so a
 * repository can swap its backing store by configuration without changing its
 * own code. The API is synchronous — both backends are synchronous.
 */
export interface CollectionStore<T extends Identified> {
  list(): T[];
  get(id: string): T | undefined;
  upsert(item: T): T;
  delete(id: string): void;
}

/**
 * A tiny JSON-file-backed store for small, durable collections (e.g. the Source
 * Inbox and campaigns). Pure Node fs — no native modules — so it bundles cleanly
 * and runs anywhere. Loads on construction and flushes the whole collection on
 * every mutation via a temp file + atomic rename, so a crash mid-write can't
 * corrupt the store. Volume here is small, so a full rewrite per change is the
 * simplest safe option (the same approach as the `file` persistence driver).
 */
export class JsonFileStore<T extends Identified> implements CollectionStore<T> {
  private readonly byId = new Map<string, T>();

  constructor(private readonly path: string) {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.path)) return;
      const raw = readFileSync(this.path, 'utf8');
      if (!raw.trim()) return;
      for (const item of JSON.parse(raw) as T[]) this.byId.set(item.id, item);
    } catch {
      // Start empty on a missing/corrupt/unreadable file rather than crash.
    }
  }

  private save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify([...this.byId.values()], null, 2));
    renameSync(tmp, this.path);
  }

  list(): T[] {
    return [...this.byId.values()];
  }

  get(id: string): T | undefined {
    return this.byId.get(id);
  }

  upsert(item: T): T {
    this.byId.set(item.id, item);
    this.save();
    return item;
  }

  delete(id: string): void {
    if (this.byId.delete(id)) this.save();
  }
}
