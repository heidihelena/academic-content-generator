import type { VaultNote } from '../vault/note';
import {
  isVaultSourceId,
  noteToSource,
  pathFromVaultSourceId,
  vaultSourceId,
} from './vault-source';

describe('vault source ids', () => {
  it('round-trips a path through a URL-safe id', () => {
    const path = 'Daily Notes/2026-01-01 ideas.md';
    const id = vaultSourceId(path);
    expect(id.startsWith('vault_')).toBe(true);
    expect(id).not.toContain('/');
    expect(isVaultSourceId(id)).toBe(true);
    expect(pathFromVaultSourceId(id)).toBe(path);
  });

  it('treats non-prefixed ids as manual', () => {
    expect(isVaultSourceId('src_123')).toBe(false);
  });
});

describe('noteToSource', () => {
  it('maps a vault note to a read-only note source', () => {
    const note: VaultNote = {
      path: 'Notes/Sleep.md',
      title: 'Sleep',
      authors: ['A. Researcher'],
      year: 2024,
      doi: '10.1/x',
      tags: ['neuro'],
      body: 'memory',
      modifiedAt: '2026-03-01T00:00:00.000Z',
    };
    const source = noteToSource(note);
    expect(source.id).toBe(vaultSourceId('Notes/Sleep.md'));
    expect(source.kind).toBe('note');
    expect(source.title).toBe('Sleep');
    expect(source.authors).toEqual(['A. Researcher']);
    expect(source.importedAt).toBe('2026-03-01T00:00:00.000Z');
  });
});
