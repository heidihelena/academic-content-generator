import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { VaultNote } from '../vault/note';
import type { VaultService } from '../vault/vault.service';
import { InMemorySourcesRepository } from './sources.repository';
import { SourcesService } from './sources.service';
import { vaultSourceId } from './vault-source';

class FakeVault {
  constructor(private readonly notes: VaultNote[] = []) {}
  async listNotes(): Promise<VaultNote[]> {
    return this.notes;
  }
  async getNote(path: string): Promise<VaultNote | null> {
    return this.notes.find((n) => n.path === path) ?? null;
  }
}

function makeService(notes: VaultNote[] = []): SourcesService {
  return new SourcesService(
    new InMemorySourcesRepository(),
    new FakeVault(notes) as unknown as VaultService,
  );
}

const note = (over: Partial<VaultNote> = {}): VaultNote => ({
  path: 'Notes/Sleep.md',
  title: 'Sleep and memory',
  tags: ['neuro'],
  body: 'memory consolidation during sleep',
  modifiedAt: '2026-03-01T00:00:00.000Z',
  ...over,
});

describe('SourcesService (manual)', () => {
  it('creates a source with a generated id, importedAt and default tags', async () => {
    const svc = makeService();
    const source = await svc.create({ kind: 'paper', title: '  Sleep and memory  ' });
    expect(source.id).toMatch(/^src_/);
    expect(source.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(source.title).toBe('Sleep and memory');
    expect(source.tags).toEqual([]);
  });

  it('rejects a missing title or an invalid kind', async () => {
    const svc = makeService();
    await expect(svc.create({ kind: 'paper', title: '   ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.create({ kind: 'bogus' as never, title: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gets a source by id and lists created sources', async () => {
    const svc = makeService();
    const a = await svc.create({ kind: 'note', title: 'A' });
    const b = await svc.create({ kind: 'link', title: 'B', url: 'https://example.org' });
    expect(await svc.get(b.id)).toEqual(b);
    expect((await svc.list()).map((s) => s.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('throws NotFound for an unknown id', async () => {
    await expect(makeService().get('src_missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SourcesService (hybrid with vault)', () => {
  it('lists manual sources and live vault notes together, newest first', async () => {
    const svc = makeService([note({ modifiedAt: '2026-05-01T00:00:00.000Z' })]);
    await svc.create({ kind: 'paper', title: 'Older manual' }); // importedAt = now (2026+)
    const list = await svc.list();
    const kinds = list.map((s) => s.kind);
    expect(list.some((s) => s.id.startsWith('vault_'))).toBe(true);
    expect(list.some((s) => s.id.startsWith('src_'))).toBe(true);
    expect(kinds).toContain('note');
  });

  it('resolves a vault-backed source by its encoded id', async () => {
    const n = note();
    const svc = makeService([n]);
    const got = await svc.get(vaultSourceId(n.path));
    expect(got.kind).toBe('note');
    expect(got.title).toBe('Sleep and memory');
    expect(got.body).toContain('memory consolidation');
  });

  it('404s a vault id whose note no longer exists', async () => {
    const svc = makeService([]); // empty vault
    await expect(svc.get(vaultSourceId('Gone.md'))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('searches across both manual sources and vault notes', async () => {
    const svc = makeService([note({ title: 'Hippocampus', body: 'spatial memory' })]);
    await svc.create({ kind: 'link', title: 'Sleep hygiene', url: 'https://x' });
    expect((await svc.search('hippocampus')).map((s) => s.title)).toEqual(['Hippocampus']);
    expect((await svc.search('sleep')).map((s) => s.title)).toEqual(['Sleep hygiene']);
    expect((await svc.search('memory')).length).toBe(1);
  });
});
