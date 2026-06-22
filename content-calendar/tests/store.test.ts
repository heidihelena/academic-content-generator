import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { __setIntegration } from '../src/integrations/registry';
import { MockPlatformIntegration } from '../src/integrations/mockIntegration';

/** Resets the store to a clean, seeded state before each test. */
function resetStore() {
  __setPersistence(new MemoryPersistence());
  useStore.setState({
    posts: [],
    accounts: [],
    platformFilter: 'all',
    statusFilter: 'all',
    editingPostId: null,
    isEditorOpen: false,
    accountBusy: {},
    accountError: {},
    weekAnchor: new Date().toISOString(),
  });
  useStore.getState().initialize();
}

describe('store: initialization & filtering', () => {
  beforeEach(resetStore);

  it('seeds sample posts and accounts on first init', () => {
    const { posts, accounts } = useStore.getState();
    expect(posts.length).toBeGreaterThan(0);
    expect(accounts).toHaveLength(5);
  });

  it('filteredPosts applies platform filter', () => {
    useStore.getState().setPlatformFilter('linkedin');
    const filtered = useStore.getState().filteredPosts();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((p) => p.platform === 'linkedin')).toBe(true);
  });

  it('filteredPosts applies status filter', () => {
    useStore.getState().setStatusFilter('draft');
    const filtered = useStore.getState().filteredPosts();
    expect(filtered.every((p) => p.status === 'draft')).toBe(true);
  });

  it('combines platform and status filters', () => {
    const s = useStore.getState();
    s.setPlatformFilter('instagram');
    s.setStatusFilter('published');
    const filtered = useStore.getState().filteredPosts();
    expect(filtered.every((p) => p.platform === 'instagram' && p.status === 'published')).toBe(true);
  });
});

describe('store: post CRUD', () => {
  beforeEach(resetStore);

  it('savePost adds a new post', () => {
    const before = useStore.getState().posts.length;
    useStore.getState().savePost({
      platform: 'threads',
      body: 'A brand new post',
      scheduledAt: new Date('2026-06-20T10:00:00').toISOString(),
      status: 'scheduled',
      media: [],
    });
    const after = useStore.getState().posts;
    expect(after).toHaveLength(before + 1);
    expect(after.some((p) => p.body === 'A brand new post')).toBe(true);
  });

  it('savePost edits an existing post', () => {
    const target = useStore.getState().posts[0];
    useStore.getState().savePost({
      id: target.id,
      platform: target.platform,
      body: 'Edited caption',
      scheduledAt: target.scheduledAt,
      status: 'published',
      media: target.media,
    });
    const updated = useStore.getState().posts.find((p) => p.id === target.id)!;
    expect(updated.body).toBe('Edited caption');
    expect(updated.status).toBe('published');
  });

  it('deletePost removes a post', () => {
    const target = useStore.getState().posts[0];
    useStore.getState().deletePost(target.id);
    expect(useStore.getState().posts.find((p) => p.id === target.id)).toBeUndefined();
  });

  it('reschedulePost moves a post to a new day', () => {
    const target = useStore.getState().posts[0];
    const newDay = new Date('2026-06-21T00:00:00');
    useStore.getState().reschedulePost(target.id, newDay);
    const moved = useStore.getState().posts.find((p) => p.id === target.id)!;
    expect(new Date(moved.scheduledAt).getDate()).toBe(21);
  });

  it('persists changes through the persistence adapter', () => {
    const adapter = new MemoryPersistence();
    __setPersistence(adapter);
    useStore.getState().savePost({
      platform: 'instagram',
      body: 'persist me',
      scheduledAt: new Date().toISOString(),
      status: 'draft',
      media: [],
    });
    expect(adapter.load()?.posts.some((p) => p.body === 'persist me')).toBe(true);
  });
});

describe('store: connected-account states', () => {
  beforeEach(resetStore);

  it('connectAccount transitions disconnected -> connected', async () => {
    __setIntegration(
      'threads',
      new MockPlatformIntegration('threads', {
        handle: '@vahtian',
        displayName: 'vahtian',
        followers: 100,
        latencyMs: 0,
      }),
    );

    const promise = useStore.getState().connectAccount('threads');
    // Busy flag is set synchronously before the await resolves.
    expect(useStore.getState().accountBusy.threads).toBe(true);

    await vi.runAllTimersAsync();
    await promise;

    const account = useStore.getState().accounts.find((a) => a.platform === 'threads')!;
    expect(account.status).toBe('connected');
    expect(account.handle).toBe('@vahtian');
    expect(useStore.getState().accountBusy.threads).toBe(false);
  });

  it('connectAccount surfaces an error state on failure', async () => {
    __setIntegration(
      'threads',
      new MockPlatformIntegration('threads', {
        handle: '@x',
        displayName: 'x',
        followers: 0,
        failConnect: true,
        latencyMs: 0,
      }),
    );

    const promise = useStore.getState().connectAccount('threads');
    await vi.runAllTimersAsync();
    await promise;

    const account = useStore.getState().accounts.find((a) => a.platform === 'threads')!;
    expect(account.status).toBe('error');
    expect(account.statusDetail).toBeTruthy();
    expect(useStore.getState().accountError.threads).toBeTruthy();
  });

  it('disconnectAccount transitions connected -> disconnected', async () => {
    const promise = useStore.getState().disconnectAccount('instagram');
    await vi.runAllTimersAsync();
    await promise;
    const account = useStore.getState().accounts.find((a) => a.platform === 'instagram')!;
    expect(account.status).toBe('disconnected');
    expect(account.handle).toBeUndefined();
  });
});
