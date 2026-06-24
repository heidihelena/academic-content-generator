import { describe, expect, it } from 'vitest';
import { LocalSourcesClient } from '../src/sources/sourcesClient';
import { isVaultSource, sourceMaterial, type Source } from '../src/sources/sourcesTypes';

const seed: Source[] = [
  { id: 'src_a', kind: 'paper', title: 'Trees and heat', abstract: 'cooler streets', tags: ['urban'], importedAt: '2026-01-02T00:00:00.000Z' },
  { id: 'vault_xyz', kind: 'note', title: 'Sleep notes', body: 'memory', tags: ['neuro'], importedAt: '2026-01-03T00:00:00.000Z' },
];

describe('LocalSourcesClient', () => {
  it('lists seeded sources newest first', async () => {
    const list = await new LocalSourcesClient(seed).list();
    expect(list.map((s) => s.id)).toEqual(['vault_xyz', 'src_a']);
  });

  it('searches title / abstract / body / tags', async () => {
    const client = new LocalSourcesClient(seed);
    expect((await client.list('urban')).map((s) => s.id)).toEqual(['src_a']);
    expect((await client.list('memory')).map((s) => s.id)).toEqual(['vault_xyz']);
    expect((await client.list('SLEEP')).map((s) => s.id)).toEqual(['vault_xyz']);
  });

  it('creates a manual source with a generated id', async () => {
    const client = new LocalSourcesClient([]);
    const created = await client.create({ kind: 'link', title: 'New', url: 'https://x' });
    expect(created.id).toMatch(/^src_/);
    expect((await client.list()).map((s) => s.title)).toContain('New');
  });

  it('rejects a blank title', async () => {
    await expect(new LocalSourcesClient([]).create({ kind: 'paper', title: '  ' })).rejects.toThrow();
  });
});

describe('source helpers', () => {
  it('flags vault-backed ids and extracts draft material', () => {
    expect(isVaultSource(seed[1])).toBe(true);
    expect(isVaultSource(seed[0])).toBe(false);
    expect(sourceMaterial(seed[0])).toBe('cooler streets');
    expect(sourceMaterial(seed[1])).toBe('memory');
  });
});
