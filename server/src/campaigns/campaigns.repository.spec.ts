import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Campaign } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';
import { FileCampaignsRepository } from './campaigns.repository';

const campaign = (id: string, createdAt: string): Campaign => ({
  id,
  title: id,
  createdAt,
  updatedAt: createdAt,
});

describe('FileCampaignsRepository', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cmp-'));
    path = join(dir, 'campaigns.json');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persists campaigns across instances, newest first, and deletes durably', async () => {
    const repo = new FileCampaignsRepository(new JsonFileStore(path));
    await repo.upsert(campaign('a', '2026-01-01T00:00:00.000Z'));
    await repo.upsert(campaign('b', '2026-02-01T00:00:00.000Z'));

    const reloaded = new FileCampaignsRepository(new JsonFileStore(path));
    expect((await reloaded.list()).map((c) => c.id)).toEqual(['b', 'a']);

    await reloaded.delete('a');
    const again = new FileCampaignsRepository(new JsonFileStore(path));
    expect((await again.list()).map((c) => c.id)).toEqual(['b']);
  });
});
