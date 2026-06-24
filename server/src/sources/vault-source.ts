import { SourceMaterial } from '../domain/academic';
import type { VaultNote } from '../vault/note';

/**
 * Bridges vault notes into the Source Inbox. A vault note's id encodes its
 * relative path (base64url, so it is URL-safe in `/sources/:id`) behind a
 * `vault_` prefix, which lets the inbox tell vault-backed sources apart from
 * manually-added ones and resolve them back to a file.
 */
const VAULT_PREFIX = 'vault_';

export function isVaultSourceId(id: string): boolean {
  return id.startsWith(VAULT_PREFIX);
}

export function vaultSourceId(path: string): string {
  return VAULT_PREFIX + Buffer.from(path, 'utf8').toString('base64url');
}

export function pathFromVaultSourceId(id: string): string {
  return Buffer.from(id.slice(VAULT_PREFIX.length), 'base64url').toString('utf8');
}

/** Maps a vault note to a (read-only) SourceMaterial. */
export function noteToSource(note: VaultNote): SourceMaterial {
  return {
    id: vaultSourceId(note.path),
    kind: 'note',
    title: note.title,
    authors: note.authors,
    year: note.year,
    doi: note.doi,
    body: note.body,
    tags: note.tags,
    importedAt: note.modifiedAt,
  };
}
