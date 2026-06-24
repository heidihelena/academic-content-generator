import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InMemorySourcesRepository } from './sources.repository';
import { SourcesService } from './sources.service';

function makeService(): SourcesService {
  return new SourcesService(new InMemorySourcesRepository());
}

describe('SourcesService', () => {
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

  it('searches title / abstract / body / tags case-insensitively', async () => {
    const svc = makeService();
    await svc.create({
      kind: 'paper',
      title: 'Hippocampus study',
      abstract: 'memory consolidation during sleep',
    });
    await svc.create({ kind: 'note', title: 'Unrelated', tags: ['admin'] });
    expect((await svc.search('MEMORY')).length).toBe(1);
    expect((await svc.search('hippo')).length).toBe(1);
    expect((await svc.search('admin')).length).toBe(1);
    expect((await svc.search('')).length).toBe(2);
  });
});
