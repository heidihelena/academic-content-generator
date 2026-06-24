/** Source Inbox types, mirroring the server's `SourceMaterial` (issue #28). */

export const SOURCE_KINDS = ['paper', 'note', 'link', 'lecture'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  authors?: string[];
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  body?: string;
  tags: string[];
  importedAt: string;
}

export interface CreateSourceInput {
  kind: SourceKind;
  title: string;
  url?: string;
  doi?: string;
  abstract?: string;
  tags?: string[];
}

/** Vault-backed sources carry a `vault_`-prefixed id and are read-only. */
export function isVaultSource(source: Source): boolean {
  return source.id.startsWith('vault_');
}

/** The text a Draft Studio draft is composed from. */
export function sourceMaterial(source: Source): string {
  return (source.abstract || source.body || '').trim();
}
