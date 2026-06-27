import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

/**
 * Writable local settings — the local-Mac paths the Connections panel manages so
 * they persist without hand-editing `.env`. **Non-secret only** (paths + driver):
 * API keys, app passwords and tokens stay in `.env` and are never written here,
 * so this file is safe to keep in iCloud-free local storage.
 *
 * Precedence (see `configuration.ts`): an explicit env var wins, then this file,
 * then the built-in default. So the panel writes here, and a power user can still
 * override with an env var.
 */
export interface LocalSettings {
  /** Obsidian vault path (the input). For a local Mac this is the iCloud vault. */
  vaultPath?: string;
  /** `memory | file | sqlite | neon`. For a local Mac, `sqlite` kept on-disk. */
  persistenceDriver?: string;
  /** SQLite file path — kept **local** (not iCloud) to avoid two-Mac corruption. */
  sqlitePath?: string;
}

const KEYS: (keyof LocalSettings)[] = ['vaultPath', 'persistenceDriver', 'sqlitePath'];

/**
 * `~/forskai/settings.json`, or `FORSKAI_SETTINGS_PATH` when set. The override
 * also keeps tests hermetic (they point at a temp file, never the real home).
 */
export function settingsPath(): string {
  return process.env.FORSKAI_SETTINGS_PATH ?? join(homedir(), 'forskai', 'settings.json');
}

/**
 * Read the local settings. Returns `{}` on any miss — missing file, unreadable,
 * or malformed JSON — and never throws, so a corrupt file can't crash startup.
 */
export function readLocalSettings(path = settingsPath()): LocalSettings {
  try {
    if (!existsSync(path)) return {};
    return pick(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return {};
  }
}

/**
 * Merge `patch` over the current settings and persist with owner-only (`0600`)
 * permissions, creating the directory if needed. Only known string keys survive
 * `pick()`, so arbitrary or secret fields in the body are dropped, not written.
 */
export function writeLocalSettings(patch: LocalSettings, path = settingsPath()): LocalSettings {
  const next = { ...readLocalSettings(path), ...pick(patch) };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600); // enforce 0600 even when overwriting an existing file
  return next;
}

/** Keep only known, non-empty string keys — drops unknown/secret/non-string fields. */
function pick(raw: unknown): LocalSettings {
  const out: LocalSettings = {};
  if (raw && typeof raw === 'object') {
    for (const k of KEYS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
  }
  return out;
}
