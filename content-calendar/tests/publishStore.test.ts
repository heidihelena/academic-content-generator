import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

// Hydrate store + the shared LocalDataSource from sample data (a connected
// Bluesky account and Bluesky posts), so publishPost resolves by id like the
// real create→publish flow rather than diverging from the data source.
function firstBlueskyId(): string {
  return useStore.getState().posts.find((p) => p.platform === 'bluesky')!.id;
}

describe('store.publishPost', () => {
  beforeEach(() => {
    __setPersistence(new MemoryPersistence());
    useStore.setState({ publishingId: null, publishError: null });
    useStore.getState().initialize();
  });

  it('marks the post published and clears any prior error', async () => {
    const id = firstBlueskyId();
    const ok = await useStore.getState().publishPost(id);
    expect(ok).toBe(true);

    const post = useStore.getState().posts.find((p) => p.id === id)!;
    expect(post.status).toBe('published');
    expect(post.permalink).toBeTruthy();
    expect(useStore.getState().publishError).toBeNull();
    expect(useStore.getState().publishingId).toBeNull();
  });

  it('surfaces a failure reason when the account is disconnected', async () => {
    await useStore.getState().disconnectAccount('bluesky');
    const id = firstBlueskyId();

    const ok = await useStore.getState().publishPost(id);
    expect(ok).toBe(false);

    expect(useStore.getState().posts.find((p) => p.id === id)!.status).toBe('failed');
    expect(useStore.getState().publishError).toMatch(/No connected bluesky/);
    expect(useStore.getState().publishingId).toBeNull();
  });
});
