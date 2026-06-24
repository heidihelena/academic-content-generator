import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SourceMaterial } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';
import { FileSourcesRepository } from './sources.repository';

const source = (id: string, importedAt: string): SourceMaterial => ({
  id,
  kind: 'note',
  title: id,
  tags: [],
  importedAt,
});

describe('FileSourcesRepository', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'src-'));
    path = join(dir, 'sources.json');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persists sources across instances, newest first', async () => {
    const repo = new FileSourcesRepository(new JsonFileStore(path));
    await repo.upsert(source('a', '2026-01-01T00:00:00.000Z'));
    await repo.upsert(source('b', '2026-02-01T00:00:00.000Z'));

    const reloaded = new FileSourcesRepository(new JsonFileStore(path));
    expect((await reloaded.list()).map((s) => s.id)).toEqual(['b', 'a']);
    expect((await reloaded.findById('a'))?.title).toBe('a');
    expect(await reloaded.findById('missing')).toBeNull();
  });
});
