import { create } from 'zustand';
import type {
  ConnectedAccount,
  Platform,
  PlatformFilter,
  Post,
  PostDraft,
  PostStatus,
} from '../types';
import {
  LocalStoragePersistence,
  type PersistenceAdapter,
} from '../lib/persistence';
import { createSampleAccounts, createSamplePosts } from '../data/sampleData';
import { applyReschedule } from '../lib/scheduling';
import { createId } from '../lib/id';
import { getIntegration } from '../integrations/registry';
import type { AccessToken } from '../integrations/types';

/**
 * Central application store (state management layer).
 *
 * The store is the only stateful surface the UI talks to. It depends on the
 * `PersistenceAdapter` and `PlatformIntegration` interfaces, not concrete
 * implementations, so backends can be swapped without UI changes.
 */

export interface StoreState {
  // --- Data ---
  posts: Post[];
  accounts: ConnectedAccount[];

  // --- UI state ---
  weekAnchor: string; // ISO date for the currently viewed week
  platformFilter: PlatformFilter;
  statusFilter: PostStatus | 'all';
  editingPostId: string | null;
  isEditorOpen: boolean;

  // --- Async/UX state ---
  /** Per-platform busy flag while connecting/disconnecting. */
  accountBusy: Partial<Record<Platform, boolean>>;
  /** Per-platform error message for the connected-accounts panel. */
  accountError: Partial<Record<Platform, string | undefined>>;

  // --- Lifecycle ---
  initialize: () => void;

  // --- Filters & navigation ---
  setPlatformFilter: (filter: PlatformFilter) => void;
  setStatusFilter: (filter: PostStatus | 'all') => void;
  goToWeek: (date: Date) => void;
  goToToday: () => void;

  // --- Post CRUD ---
  openEditor: (postId?: string) => void;
  openEditorForNewPost: (platform: Platform, scheduledAt: string) => void;
  closeEditor: () => void;
  savePost: (draft: PostDraft) => void;
  deletePost: (postId: string) => void;
  reschedulePost: (postId: string, targetDay: Date) => void;

  // --- Account actions (async, via integration layer) ---
  connectAccount: (platform: Platform) => Promise<void>;
  disconnectAccount: (platform: Platform) => Promise<void>;

  // --- Derived selectors ---
  filteredPosts: () => Post[];
}

// Persistence adapter is injectable for tests (see __setPersistence below).
let persistence: PersistenceAdapter = new LocalStoragePersistence();

/** Test seam: swap the persistence adapter (e.g. MemoryPersistence). */
export function __setPersistence(adapter: PersistenceAdapter): void {
  persistence = adapter;
}

// Mock token store. A real app would store these securely server-side.
const tokens = new Map<Platform, AccessToken>();

function persist(state: Pick<StoreState, 'posts' | 'accounts'>): void {
  persistence.save({ posts: state.posts, accounts: state.accounts });
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
    const saved = persistence.load();
    if (saved) {
      set({ posts: saved.posts, accounts: saved.accounts });
    } else {
      const posts = createSamplePosts();
      const accounts = createSampleAccounts();
      set({ posts, accounts });
      persist({ posts, accounts });
    }
  },

  setPlatformFilter: (filter) => set({ platformFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  goToWeek: (date) => set({ weekAnchor: date.toISOString() }),
  goToToday: () => set({ weekAnchor: new Date().toISOString() }),

  openEditor: (postId) => set({ editingPostId: postId ?? null, isEditorOpen: true }),

  openEditorForNewPost: (platform, scheduledAt) => {
    // Creates a draft shell post, then opens the editor on it. This keeps the
    // editor logic uniform (it always edits an existing post object).
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
    const posts = [...get().posts, post];
    set({ posts, editingPostId: post.id, isEditorOpen: true });
    persist({ posts, accounts: get().accounts });
  },

  closeEditor: () => set({ isEditorOpen: false, editingPostId: null }),

  savePost: (draft) => {
    const now = new Date().toISOString();
    let posts: Post[];
    if (draft.id && get().posts.some((p) => p.id === draft.id)) {
      posts = get().posts.map((p) =>
        p.id === draft.id
          ? {
              ...p,
              platform: draft.platform,
              body: draft.body,
              scheduledAt: draft.scheduledAt,
              status: draft.status,
              media: draft.media,
              updatedAt: now,
            }
          : p,
      );
    } else {
      posts = [
        ...get().posts,
        {
          id: draft.id ?? createId('post'),
          platform: draft.platform,
          body: draft.body,
          scheduledAt: draft.scheduledAt,
          status: draft.status,
          media: draft.media,
          createdAt: now,
          updatedAt: now,
        },
      ];
    }
    set({ posts, isEditorOpen: false, editingPostId: null });
    persist({ posts, accounts: get().accounts });
  },

  deletePost: (postId) => {
    const posts = get().posts.filter((p) => p.id !== postId);
    set({ posts, isEditorOpen: false, editingPostId: null });
    persist({ posts, accounts: get().accounts });
  },

  reschedulePost: (postId, targetDay) => {
    const posts = applyReschedule(get().posts, postId, targetDay);
    set({ posts });
    persist({ posts, accounts: get().accounts });
  },

  connectAccount: async (platform) => {
    set((s) => ({
      accountBusy: { ...s.accountBusy, [platform]: true },
      accountError: { ...s.accountError, [platform]: undefined },
    }));
    try {
      const integration = getIntegration(platform);
      const { account, token } = await integration.connect();
      tokens.set(platform, token);
      const accounts = get().accounts.map((a) => (a.platform === platform ? account : a));
      set((s) => ({ accounts, accountBusy: { ...s.accountBusy, [platform]: false } }));
      persist({ posts: get().posts, accounts });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed.';
      const accounts = get().accounts.map((a) =>
        a.platform === platform ? { ...a, status: 'error' as const, statusDetail: message } : a,
      );
      set((s) => ({
        accounts,
        accountBusy: { ...s.accountBusy, [platform]: false },
        accountError: { ...s.accountError, [platform]: message },
      }));
    }
  },

  disconnectAccount: async (platform) => {
    set((s) => ({ accountBusy: { ...s.accountBusy, [platform]: true } }));
    const token = tokens.get(platform);
    try {
      if (token) await getIntegration(platform).disconnect(token);
    } finally {
      tokens.delete(platform);
      const accounts = get().accounts.map((a) =>
        a.platform === platform
          ? {
              platform,
              status: 'disconnected' as const,
            }
          : a,
      );
      set((s) => ({ accounts, accountBusy: { ...s.accountBusy, [platform]: false } }));
      persist({ posts: get().posts, accounts });
    }
  },

  filteredPosts: () => {
    const { posts, platformFilter, statusFilter } = get();
    return posts.filter((p) => {
      const platformOk = platformFilter === 'all' || p.platform === platformFilter;
      const statusOk = statusFilter === 'all' || p.status === statusFilter;
      return platformOk && statusOk;
    });
  },
}));
