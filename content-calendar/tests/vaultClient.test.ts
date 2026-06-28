import { describe, expect, it } from 'vitest';
import { LocalVaultClient, type VaultHit } from '../src/vault/vaultClient';

const seed = [
  { id: 'vault_a', source: 'a.md', title: 'Urban heat', content: 'street trees cool pavement' },
  { id: 'vault_b', source: 'b.md', title: 'Sleep', content: 'memory consolidation in slow-wave sleep' },
];

describe('LocalVaultClient', () => {
  it('ranks notes by lexical overlap, highest first', async () => {
    const hits = await new LocalVaultClient(seed).search('street trees');
    expect(hits.map((h) => h.id)).toEqual(['vault_a']);
    expect(hits[0].score).toBe(1);
  });

  it('matches across title and content, case-insensitively', async () => {
    const client = new LocalVaultClient(seed);
    expect((await client.search('SLEEP')).map((h) => h.id)).toEqual(['vault_b']);
    expect((await client.search('memory')).map((h) => h.id)).toEqual(['vault_b']);
  });

  it('gives partial scores for partial term matches and orders by score', async () => {
    // "sleep" hits b (title+content); "trees" hits a — each one of two terms.
    const hits = await new LocalVaultClient(seed).search('sleep trees');
    expect(hits.every((h: VaultHit) => h.score === 0.5)).toBe(true);
    expect(hits.map((h) => h.id).sort()).toEqual(['vault_a', 'vault_b']);
  });

  it('returns nothing for a blank query or no match', async () => {
    const client = new LocalVaultClient(seed);
    expect(await client.search('   ')).toEqual([]);
    expect(await client.search('quantum')).toEqual([]);
  });

  it('respects the k limit', async () => {
    // "the" matches neither; use a term in both notes via content overlap.
    const wide = [
      { id: 'v1', source: '1.md', content: 'sleep study one' },
      { id: 'v2', source: '2.md', content: 'sleep study two' },
      { id: 'v3', source: '3.md', content: 'sleep study three' },
    ];
    const hits = await new LocalVaultClient(wide).search('sleep', 2);
    expect(hits).toHaveLength(2);
  });

  it('reports zeros for an offline ingest (no vault to embed)', async () => {
    expect(await new LocalVaultClient(seed).ingest()).toEqual({
      files: 0,
      chunks: 0,
      embedded: 0,
      skipped: 0,
    });
  });

  it('ships a usable sample vault by default', async () => {
    const hits = await new LocalVaultClient().search('canopy heat');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].source).toContain('urban-heat');
  });
});
