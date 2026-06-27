import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { Logger } from '@nestjs/common';

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
  private readonly logger = new Logger(JsonFileStore.name);

  constructor(private readonly path: string) {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) return; // first run — start empty, no file yet
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (err) {
      this.logger.warn(`Could not read ${this.path}; starting empty. ${String(err)}`);
      return;
    }
    if (!raw.trim()) return;
    try {
      for (const item of JSON.parse(raw) as T[]) this.byId.set(item.id, item);
    } catch (err) {
      // The file has content but isn't valid JSON. Preserve it — a later save()
      // would otherwise overwrite real data with an empty collection — and surface
      // the problem instead of silently starting empty.
      const backup = `${this.path}.corrupt`;
      try {
        renameSync(this.path, backup);
        this.logger.error(`${this.path} is corrupt; moved it to ${backup} and started empty. ${String(err)}`);
      } catch (mvErr) {
        this.logger.error(
          `${this.path} is corrupt and could not be backed up; starting empty. ${String(err)} / ${String(mvErr)}`,
        );
      }
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
