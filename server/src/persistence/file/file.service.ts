import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type {
  AccessToken,
  ConnectedAccount,
  Post,
  VaultChunk,
} from '../../domain/types';

interface Snapshot {
  posts: Post[];
  accounts: ConnectedAccount[];
  tokens: AccessToken[];
  vectors: { chunk: VaultChunk; embedding: number[] }[];
}

/**
 * A single JSON file backing the `file` persistence driver. Pure Node fs — no
 * native modules — so it bundles cleanly into the desktop app and runs on a
 * fresh machine without a compile step. Holds posts, accounts, OAuth tokens and
 * vault vectors in memory and flushes the whole snapshot on every mutation.
 *
 * Writes go to a temp file then rename, so a crash mid-write can't corrupt the
 * store. Volume here is small (a personal content calendar), so a full rewrite
 * per change is simpler and safer than incremental updates.
 */
@Injectable()
export class FileStoreService {
  private readonly logger = new Logger(FileStoreService.name);
  readonly path: string;
  readonly posts = new Map<string, Post>();
  readonly accounts = new Map<string, ConnectedAccount>();
  readonly tokens = new Map<string, AccessToken>();
  readonly vectors = new Map<string, { chunk: VaultChunk; embedding: number[] }>();

  constructor() {
    this.path = process.env.FILE_STORE_PATH ?? './data/store.json';
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) return; // first run — no snapshot yet
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (err) {
      this.logger.warn(`Could not read ${this.path}; starting empty. ${String(err)}`);
      return;
    }
    if (!raw.trim()) return;

    let snap: Partial<Snapshot>;
    try {
      snap = JSON.parse(raw) as Partial<Snapshot>;
    } catch (err) {
      // Corrupt snapshot: preserve it rather than start empty — a later save()
      // would otherwise overwrite real data (posts, accounts, OAuth tokens) with
      // an empty snapshot, silently signing the user out and losing their work.
      const backup = `${this.path}.corrupt`;
      try {
        renameSync(this.path, backup);
        this.logger.error(`${this.path} is corrupt; moved it to ${backup} and started empty. ${String(err)}`);
      } catch (mvErr) {
        this.logger.error(
          `${this.path} is corrupt and could not be backed up; starting empty. ${String(err)} / ${String(mvErr)}`,
        );
      }
      return;
    }

    for (const p of snap.posts ?? []) this.posts.set(p.id, p);
    for (const a of snap.accounts ?? []) this.accounts.set(a.platform, a);
    for (const t of snap.tokens ?? []) this.tokens.set(t.platform, t);
    for (const v of snap.vectors ?? []) this.vectors.set(v.chunk.id, v);
    this.logger.log(`Loaded store from ${this.path}`);
  }

  /** Write the full snapshot to disk (temp file + atomic rename). */
  save(): void {
    const snap: Snapshot = {
      posts: [...this.posts.values()],
      accounts: [...this.accounts.values()],
      tokens: [...this.tokens.values()],
      vectors: [...this.vectors.values()],
    };
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      const tmp = `${this.path}.tmp`;
      writeFileSync(tmp, JSON.stringify(snap, null, 2));
      renameSync(tmp, this.path);
    } catch (err) {
      this.logger.error(`Failed to write ${this.path}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
