import { describe, expect, it } from 'vitest';
import { LocalDataSource } from '../src/lib/dataSource';
import { MemoryPersistence } from '../src/lib/persistence';
import type { Post } from '../src/types';

function blueskyPost(ds: LocalDataSource): Post {
  // The sample data ships a connected Bluesky account and Bluesky posts.
  return ds.loadSync().posts.find((p) => p.platform === 'bluesky')!;
}

describe('LocalDataSource.publishPost', () => {
  it('publishes a post whose platform account is connected', async () => {
    const ds = new LocalDataSource(new MemoryPersistence());
    const post = blueskyPost(ds);

    const result = await ds.publishPost(post.id);
    expect(result.status).toBe('published');
    expect(result.permalink).toContain('bluesky');
    expect(result.remoteId).toBeTruthy();
    expect(result.publishedAt).toBeTruthy();
  });

  it('fails (with a reason) when the platform account is not connected', async () => {
    const ds = new LocalDataSource(new MemoryPersistence());
    const post = blueskyPost(ds);
    await ds.disconnectAccount('bluesky');

    const result = await ds.publishPost(post.id);
    expect(result.status).toBe('failed');
    expect(result.statusDetail).toMatch(/No connected bluesky/);
    expect(result.permalink).toBeUndefined();
  });

  it('throws for an unknown post id', async () => {
    const ds = new LocalDataSource(new MemoryPersistence());
    ds.loadSync();
    await expect(ds.publishPost('post_nope')).rejects.toThrow(/not found/i);
  });
});
