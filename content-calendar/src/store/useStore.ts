import { create } from 'zustand';
import type {
  ConnectedAccount,
  Platform,
  PlatformFilter,
  Post,
  PostDraft,
  PostStatus,
} from '../types';
import type { MediaAttachment } from '../types';
import type { PersistenceAdapter } from '../lib/persistence';
import { createDataSource, LocalDataSource, type DataSource } from '../lib/dataSource';
import { reschedulePost as computeReschedule } from '../lib/scheduling';
import { createId } from '../lib/id';

/**
 * Central application store (state management layer).
 *
 * The store is the only stateful surface the UI talks to. It depends on the
 * `DataSource` interface, so the backing store (local sample data / localStorage
 * or the NestJS API) is swappable without UI changes.
 *
 * Mutations are optimistic: local state updates immediately, then the data
 * source is told (fire-and-forget, errors surfaced). This keeps the UI snappy
 * and the actions synchronous from the caller's perspective.
 */

export interface StoreState {
  posts: Post[];
  accounts: ConnectedAccount[];

  weekAnchor: string;
  platformFilter: PlatformFilter;
  statusFilter: PostStatus | 'all';
  editingPostId: string | null;
  isEditorOpen: boolean;

  accountBusy: Partial<Record<Platform, boolean>>;
  accountError: Partial<Record<Platform, string | undefined>>;
  /** Error from the initial data load (API mode). */
  loadError?: string;

  initialize: () => void;

  setPlatformFilter: (filter: PlatformFilter) => void;
  setStatusFilter: (filter: PostStatus | 'all') => void;
  goToWeek: (date: Date) => void;
  goToToday: () => void;

  openEditor: (postId?: string) => void;
  openEditorForNewPost: (platform: Platform, scheduledAt: string) => void;
  closeEditor: () => void;
  savePost: (draft: PostDraft) => void;
  deletePost: (postId: string) => void;
  reschedulePost: (postId: string, targetDay: Date) => void;

  connectAccount: (platform: Platform) => Promise<void>;
  disconnectAccount: (platform: Platform) => Promise<void>;

  uploadMedia: (file: File) => Promise<MediaAttachment>;

  filteredPosts: () => Post[];
}

// Data source is injectable for tests (see __setDataSource / __setPersistence).
let dataSource: DataSource = createDataSource();

/** Test/runtime seam: swap the data source (e.g. ApiDataSource). */
export function __setDataSource(ds: DataSource): void {
  dataSource = ds;
}

/** Back-compat test seam: wrap a PersistenceAdapter in a LocalDataSource. */
export function __setPersistence(adapter: PersistenceAdapter): void {
  dataSource = new LocalDataSource(adapter);
}

export const useStore = create<StoreState>((set, get) => ({
  posts: [],
  accounts: [],
  weekAnchor: new Date().toISOString(),
  platformFilter: 'all',
  statusFilter: 'all',
  editingPostId: null,
  isEditorOpen: false,
  accountBusy: {},
  accountError: {},

  initialize: () => {
    // Offline/local: hydrate synchronously so the first render has data.
    if (dataSource.loadSync) {
      const { posts, accounts } = dataSource.loadSync();
      set({ posts, accounts, loadError: undefined });
      return;
    }
    // Remote: fetch and fill in when ready.
    set({ loadError: undefined });
    Promise.all([dataSource.loadPosts(), dataSource.loadAccounts()])
      .then(([posts, accounts]) => set({ posts, accounts }))
      .catch((err) =>
        set({ loadError: err instanceof Error ? err.message : 'Failed to load data' }),
      );
  },

  setPlatformFilter: (filter) => set({ platformFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  goToWeek: (date) => set({ weekAnchor: date.toISOString() }),
  goToToday: () => set({ weekAnchor: new Date().toISOString() }),

  openEditor: (postId) => set({ editingPostId: postId ?? null, isEditorOpen: true }),

  openEditorForNewPost: (platform, scheduledAt) => {
    const now = new Date().toISOString();
    const post: Post = {
      id: createId('post'),
      platform,
      body: '',
      scheduledAt,
      status: 'draft',
      media: [],
      createdAt: now,
      updatedAt: now,
    };
    set({ posts: [...get().posts, post], editingPostId: post.id, isEditorOpen: true });
    void dataSource.createPost(post).catch((err) => console.error('createPost failed', err));
  },

  closeEditor: () => set({ isEditorOpen: false, editingPostId: null }),

  savePost: (draft) => {
    const now = new Date().toISOString();
    const existing = draft.id ? get().posts.find((p) => p.id === draft.id) : undefined;
    if (existing) {
      const patch = {
        platform: draft.platform,
        body: draft.body,
        scheduledAt: draft.scheduledAt,
        status: draft.status,
        media: draft.media,
        updatedAt: now,
      };
      set({
        posts: get().posts.map((p) => (p.id === existing.id ? { ...p, ...patch } : p)),
        isEditorOpen: false,
        editingPostId: null,
      });
      void dataSource.updatePost(existing.id, patch).catch((err) => console.error('updatePost failed', err));
    } else {
      const post: Post = {
        id: draft.id ?? createId('post'),
        platform: draft.platform,
        body: draft.body,
        scheduledAt: draft.scheduledAt,
        status: draft.status,
        media: draft.media,
        createdAt: now,
        updatedAt: now,
      };
      set({ posts: [...get().posts, post], isEditorOpen: false, editingPostId: null });
      void dataSource.createPost(post).catch((err) => console.error('createPost failed', err));
    }
  },

  deletePost: (postId) => {
    set({
      posts: get().posts.filter((p) => p.id !== postId),
      isEditorOpen: false,
      editingPostId: null,
    });
    void dataSource.deletePost(postId).catch((err) => console.error('deletePost failed', err));
  },

  reschedulePost: (postId, targetDay) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const scheduledAt = computeReschedule(post, targetDay);
    if (scheduledAt === post.scheduledAt) return;
    const updatedAt = new Date().toISOString();
    set({
      posts: get().posts.map((p) => (p.id === postId ? { ...p, scheduledAt, updatedAt } : p)),
    });
    void dataSource
      .updatePost(postId, { scheduledAt, updatedAt })
      .catch((err) => console.error('reschedule failed', err));
  },

  connectAccount: async (platform) => {
    set((s) => ({
      accountBusy: { ...s.accountBusy, [platform]: true },
      accountError: { ...s.accountError, [platform]: undefined },
    }));
    try {
      const account = await dataSource.connectAccount(platform);
      set((s) => ({
        accounts: get().accounts.map((a) => (a.platform === platform ? account : a)),
        accountBusy: { ...s.accountBusy, [platform]: false },
        accountError: { ...s.accountError, [platform]: account.statusDetail },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed.';
      set((s) => ({
        accounts: get().accounts.map((a) =>
          a.platform === platform ? { ...a, status: 'error' as const, statusDetail: message } : a,
        ),
        accountBusy: { ...s.accountBusy, [platform]: false },
        accountError: { ...s.accountError, [platform]: message },
      }));
    }
  },

  disconnectAccount: async (platform) => {
    set((s) => ({ accountBusy: { ...s.accountBusy, [platform]: true } }));
    try {
      const account = await dataSource.disconnectAccount(platform);
      set((s) => ({
        accounts: get().accounts.map((a) => (a.platform === platform ? account : a)),
        accountBusy: { ...s.accountBusy, [platform]: false },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnect failed.';
      set((s) => ({
        accountBusy: { ...s.accountBusy, [platform]: false },
        accountError: { ...s.accountError, [platform]: message },
      }));
    }
  },

  uploadMedia: (file) => dataSource.uploadMedia(file),

  filteredPosts: () => {
    const { posts, platformFilter, statusFilter } = get();
    return posts.filter((p) => {
      const platformOk = platformFilter === 'all' || p.platform === platformFilter;
      const statusOk = statusFilter === 'all' || p.status === statusFilter;
      return platformOk && statusOk;
    });
  },
}));
