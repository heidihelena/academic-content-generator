import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Post } from '../../domain/types';
import { FileStoreService } from './file.service';
import {
  FileAccountsRepository,
  FilePostsRepository,
  FileTokenStore,
} from './file.repositories';

function makePost(id: string): Post {
  return {
    id,
    platform: 'linkedin',
    body: 'hello',
    scheduledAt: '2026-01-01T00:00:00.000Z',
    status: 'scheduled',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as Post;
}

describe('file persistence driver', () => {
  let dir: string;
  let storePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'file-store-'));
    storePath = join(dir, 'store.json');
    process.env.FILE_STORE_PATH = storePath;
  });

  afterEach(() => {
    delete process.env.FILE_STORE_PATH;
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists posts, accounts and tokens across a restart', async () => {
    const store = new FileStoreService();
    const posts = new FilePostsRepository(store);
    const accounts = new FileAccountsRepository(store);
    const tokens = new FileTokenStore(store);

    await posts.upsert(makePost('p1'));
    await accounts.upsert({
      platform: 'linkedin',
      status: 'connected',
      handle: 'heidi',
      displayName: 'Heidi',
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
    });
    await tokens.set({
      platform: 'linkedin',
      accessToken: 'secret',
      expiresAt: Date.now() + 1000,
      scopes: ['w_member_social'],
    });

    // Simulate an app restart: a brand-new service reading the same file.
    const reloaded = new FileStoreService();
    const reloadedPosts = new FilePostsRepository(reloaded);
    const reloadedAccounts = new FileAccountsRepository(reloaded);
    const reloadedTokens = new FileTokenStore(reloaded);

    expect((await reloadedPosts.list()).map((p) => p.id)).toEqual(['p1']);
    expect((await reloadedAccounts.findByPlatform('linkedin'))?.handle).toBe('heidi');
    expect((await reloadedTokens.get('linkedin'))?.accessToken).toBe('secret');
  });

  it('reflects deletes after a restart', async () => {
    const store = new FileStoreService();
    const posts = new FilePostsRepository(store);
    await posts.upsert(makePost('p1'));
    await posts.upsert(makePost('p2'));
    await posts.delete('p1');

    const reloaded = new FilePostsRepository(new FileStoreService());
    expect((await reloaded.list()).map((p) => p.id)).toEqual(['p2']);
  });
});
