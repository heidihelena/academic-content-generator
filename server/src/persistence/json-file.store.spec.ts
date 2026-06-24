import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { JsonFileStore } from './json-file.store';

interface Item {
  id: string;
  name: string;
}

describe('JsonFileStore', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'jfs-'));
    path = join(dir, 'store.json');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persists items across instances (survives a restart)', () => {
    const a = new JsonFileStore<Item>(path);
    a.upsert({ id: '1', name: 'one' });
    a.upsert({ id: '2', name: 'two' });

    const b = new JsonFileStore<Item>(path);
    expect(b.list().map((i) => i.id).sort()).toEqual(['1', '2']);
    expect(b.get('1')).toEqual({ id: '1', name: 'one' });
  });

  it('upsert replaces by id; delete removes and persists', () => {
    const store = new JsonFileStore<Item>(path);
    store.upsert({ id: '1', name: 'one' });
    store.upsert({ id: '1', name: 'ONE' });
    expect(store.get('1')?.name).toBe('ONE');

    store.delete('1');
    expect(new JsonFileStore<Item>(path).get('1')).toBeUndefined();
  });

  it('starts empty on a missing or corrupt file', async () => {
    expect(new JsonFileStore<Item>(join(dir, 'missing.json')).list()).toEqual([]);
    await writeFile(path, '{ not json');
    expect(new JsonFileStore<Item>(path).list()).toEqual([]);
  });
});
