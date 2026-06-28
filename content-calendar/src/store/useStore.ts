import { create } from 'zustand';
import type {
  CalendarView,
  ConnectedAccount,
  Permissions,
  Platform,
  PlatformFilter,
  Post,
  PostDraft,
  PostStatus,
} from '../types';
import type { MediaAttachment } from '../types';
import type { PersistenceAdapter } from '../lib/persistence';
import { createDataSource, LocalDataSource, type DataSource, type PlatformCredentials } from '../lib/dataSource';
import { reschedulePost as computeReschedule } from '../lib/scheduling';
import { getPlatformMeta } from '../lib/platforms';
import { splitIntoThread } from '../lib/thread';
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

  // calendarState
  weekAnchor: string;
  view: CalendarView;
  // filterState
  platformFilter: PlatformFilter;
  statusFilter: PostStatus | 'all';
  searchQuery: string;
  // selectedContentState
  editingPostId: string | null;
  isEditorOpen: boolean;
  // dragDropState
  draggingId: string | null;
  // bulkSelectionState
  selectedIds: string[];
  // permissionsState
  permissions: Permissions;

  accountBusy: Partial<Record<Platform, boolean>>;
  accountError: Partial<Record<Platform, string | undefined>>;
  /** Id of the post currently being live-published (drives the button spinner). */
  publishingId: string | null;
  /** Reason the most recent live publish failed (cleared on the next attempt). */
  publishError: string | null;
  /** Error from the initial data load (API mode). */
  loadError?: string;

  initialize: () => void;

  setView: (view: CalendarView) => void;
  setPlatformFilter: (filter: PlatformFilter) => void;
  setStatusFilter: (filter: PostStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  goToAnchor: (date: Date) => void;
  goToWeek: (date: Date) => void;
  goToToday: () => void;

  // drag-and-drop
  setDragging: (postId: string | null) => void;

  // bulk selection
  toggleSelected: (postId: string) => void;
  clearSelection: () => void;
  bulkDelete: () => void;
  bulkSetStatus: (status: PostStatus) => void;

  openEditor: (postId?: string) => void;
  openEditorForNewPost: (platform: Platform, scheduledAt: string) => void;
  closeEditor: () => void;
  savePost: (draft: PostDraft) => void;
  /** Split the draft's copy into a numbered thread of posts (platform-sized). */
  createThread: (draft: PostDraft) => void;
  /** Create a thread from already-prepared parts (e.g. the abstract drafter). */
  createThreadFromParts: (
    parts: string[],
    base: {
      platform: Platform;
      scheduledAt: string;
      status?: PostStatus;
      audience?: string;
      source?: Post['source'];
      evidenceLevel?: Post['evidenceLevel'];
    },
  ) => void;
  /** Add planned video shorts to the board as independent draft posts. */
  createShortDrafts: (
    shorts: Array<{ hook: string; caption: string; startSeconds?: number }>,
    base: { platform: Platform; audience?: string; videoUrl?: string },
  ) => void;
  deletePost: (postId: string) => void;
  /** Live-publish a post to its platform now; resolves true when published. */
  publishPost: (postId: string) => Promise<boolean>;
  reschedulePost: (postId: string, targetDay: Date) => void;
  /** Move a single post to a pipeline stage (used by the board's drag-and-drop). */
  setPostStatus: (postId: string, status: PostStatus) => void;
  /** Approve a post in review → moves it to Approved and logs the decision. */
  approvePost: (postId: string, reviewer?: string) => void;
  /** Request changes → moves the post back to Drafting and logs the note. */
  requestChanges: (postId: string, note: string, reviewer?: string) => void;

  connectAccount: (platform: Platform) => Promise<void>;
  /** Verify entered credentials and connect; resolves true on success. */
  verifyAccount: (platform: Platform, creds: PlatformCredentials) => Promise<boolean>;
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
  view: 'week',
  platformFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',
  editingPostId: null,
  isEditorOpen: false,
  draggingId: null,
  selectedIds: [],
  permissions: { canCreate: true, canEdit: true, canDelete: true, canPublish: true, canBulk: true },
  accountBusy: {},
  accountError: {},
  publishingId: null,
  publishError: null,

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

  setView: (view) => set({ view }),
  setPlatformFilter: (filter) => set({ platformFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  goToAnchor: (date) => set({ weekAnchor: date.toISOString() }),
  goToWeek: (date) => set({ weekAnchor: date.toISOString() }),
  goToToday: () => set({ weekAnchor: new Date().toISOString() }),

  setDragging: (postId) => set({ draggingId: postId }),

  toggleSelected: (postId) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(postId)
        ? s.selectedIds.filter((id) => id !== postId)
        : [...s.selectedIds, postId],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  bulkDelete: () => {
    const ids = get().selectedIds;
    if (!get().permissions.canDelete || ids.length === 0) return;
    set({ posts: get().posts.filter((p) => !ids.includes(p.id)), selectedIds: [] });
    ids.forEach((id) =>
      dataSource.deletePost(id).catch((err) => console.error('bulkDelete failed', err)),
    );
  },

  bulkSetStatus: (status) => {
    const ids = get().selectedIds;
    if (!get().permissions.canBulk || ids.length === 0) return;
    const updatedAt = new Date().toISOString();
    set({
      posts: get().posts.map((p) => (ids.includes(p.id) ? { ...p, status, updatedAt } : p)),
      selectedIds: [],
    });
    ids.forEach((id) =>
      dataSource
        .updatePost(id, { status, updatedAt })
        .catch((err) => console.error('bulkSetStatus failed', err)),
    );
  },

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
        owner: draft.owner,
        campaign: draft.campaign,
        brief: draft.brief,
        audience: draft.audience,
        theme: draft.theme,
        hook: draft.hook,
        source: draft.source,
        evidenceLevel: draft.evidenceLevel,
        reviewer: draft.reviewer,
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
        owner: draft.owner,
        campaign: draft.campaign,
        brief: draft.brief,
        audience: draft.audience,
        theme: draft.theme,
        hook: draft.hook,
        source: draft.source,
        evidenceLevel: draft.evidenceLevel,
        reviewer: draft.reviewer,
        createdAt: now,
        updatedAt: now,
      };
      set({ posts: [...get().posts, post], isEditorOpen: false, editingPostId: null });
      void dataSource.createPost(post).catch((err) => console.error('createPost failed', err));
    }
  },

  createThread: (draft) => {
    const limit = getPlatformMeta(draft.platform).characterLimit;
    const parts = splitIntoThread(draft.body, limit);
    if (parts.length <= 1) {
      // Nothing to split — fall back to a normal save.
      get().savePost(draft);
      return;
    }
    const now = new Date().toISOString();
    const start = new Date(draft.scheduledAt).getTime();
    const threadId = createId('thread');
    const created: Post[] = parts.map((body, i) => ({
      // Parts go out two minutes apart so they thread in order.
      id: createId('post'),
      platform: draft.platform,
      body,
      scheduledAt: new Date(start + i * 2 * 60_000).toISOString(),
      status: draft.status,
      // Media + structured source ride on the first post only.
      media: i === 0 ? draft.media : [],
      owner: draft.owner,
      campaign: draft.campaign,
      brief: draft.brief,
      audience: draft.audience,
      theme: draft.theme,
      hook: i === 0 ? draft.hook : undefined,
      source: i === 0 ? draft.source : undefined,
      evidenceLevel: draft.evidenceLevel,
      reviewer: draft.reviewer,
      threadId,
      threadIndex: i,
      createdAt: now,
      updatedAt: now,
    }));
    set({ posts: [...get().posts, ...created], isEditorOpen: false, editingPostId: null });
    for (const post of created) {
      void dataSource.createPost(post).catch((err) => console.error('createThread failed', err));
    }
  },

  createThreadFromParts: (parts, base) => {
    if (parts.length === 0) return;
    const now = new Date().toISOString();
    const start = new Date(base.scheduledAt).getTime();
    const threadId = createId('thread');
    const created: Post[] = parts.map((body, i) => ({
      id: createId('post'),
      platform: base.platform,
      body,
      scheduledAt: new Date(start + i * 2 * 60_000).toISOString(),
      status: base.status ?? 'draft',
      media: [],
      audience: base.audience,
      // The structured source rides on the first post only.
      source: i === 0 ? base.source : undefined,
      evidenceLevel: base.evidenceLevel,
      threadId,
      threadIndex: i,
      createdAt: now,
      updatedAt: now,
    }));
    set({ posts: [...get().posts, ...created] });
    for (const post of created) {
      void dataSource.createPost(post).catch((err) => console.error('createThreadFromParts failed', err));
    }
  },

  createShortDrafts: (shorts, base) => {
    if (shorts.length === 0) return;
    const now = new Date().toISOString();
    const day0 = new Date();
    day0.setDate(day0.getDate() + 1);
    day0.setHours(9, 0, 0, 0);
    const created: Post[] = shorts.map((s, i) => {
      // Deep-link to the clip's moment when we have a video URL + start time.
      const link =
        base.videoUrl && s.startSeconds !== undefined
          ? `\n\n▶ ${base.videoUrl}${base.videoUrl.includes('?') ? '&' : '?'}t=${Math.round(s.startSeconds)}s`
          : '';
      // Shorts go to consecutive days at 09:00 so they don't collide on the calendar.
      const when = new Date(day0.getTime() + i * 24 * 60 * 60_000);
      return {
        id: createId('post'),
        platform: base.platform,
        body: `${s.hook}\n\n${s.caption}${link}`.trim(),
        scheduledAt: when.toISOString(),
        status: 'draft',
        media: [],
        audience: base.audience,
        createdAt: now,
        updatedAt: now,
      };
    });
    set({ posts: [...get().posts, ...created] });
    for (const post of created) {
      void dataSource.createPost(post).catch((err) => console.error('createShortDrafts failed', err));
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

  publishPost: async (postId) => {
    set({ publishingId: postId, publishError: null });
    try {
      const updated = await dataSource.publishPost(postId);
      const failed = updated.status === 'failed';
      set((s) => ({
        posts: s.posts.map((p) => (p.id === postId ? { ...p, ...updated } : p)),
        publishingId: null,
        publishError: failed ? (updated.statusDetail ?? 'Publish failed.') : null,
      }));
      return !failed;
    } catch (err) {
      set({ publishingId: null, publishError: err instanceof Error ? err.message : 'Publish failed.' });
      return false;
    }
  },

  setPostStatus: (postId, status) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post || post.status === status) return;
    const updatedAt = new Date().toISOString();
    set({
      posts: get().posts.map((p) => (p.id === postId ? { ...p, status, updatedAt } : p)),
    });
    void dataSource
      .updatePost(postId, { status, updatedAt })
      .catch((err) => console.error('setPostStatus failed', err));
  },

  approvePost: (postId, reviewer) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const at = new Date().toISOString();
    const review = { id: createId('review'), decision: 'approved' as const, reviewer, at };
    const patch = {
      status: 'approved' as const,
      reviewer,
      reviews: [...(post.reviews ?? []), review],
      updatedAt: at,
    };
    set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)) });
    void dataSource.updatePost(postId, patch).catch((err) => console.error('approvePost failed', err));
  },

  requestChanges: (postId, note, reviewer) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const at = new Date().toISOString();
    const review = { id: createId('review'), decision: 'changes_requested' as const, reviewer, note, at };
    const patch = {
      status: 'draft' as const,
      reviewer,
      reviews: [...(post.reviews ?? []), review],
      updatedAt: at,
    };
    set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)) });
    void dataSource.updatePost(postId, patch).catch((err) => console.error('requestChanges failed', err));
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

  verifyAccount: async (platform, creds) => {
    set((s) => ({
      accountBusy: { ...s.accountBusy, [platform]: true },
      accountError: { ...s.accountError, [platform]: undefined },
    }));
    try {
      const account = await dataSource.verifyAccount(platform, creds);
      set((s) => ({
        accounts: get().accounts.map((a) => (a.platform === platform ? account : a)),
        accountBusy: { ...s.accountBusy, [platform]: false },
        accountError: { ...s.accountError, [platform]: account.statusDetail },
      }));
      return account.status === 'connected';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not connect.';
      set((s) => ({
        accountBusy: { ...s.accountBusy, [platform]: false },
        accountError: { ...s.accountError, [platform]: message },
      }));
      return false;
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
    const { posts, platformFilter, statusFilter, searchQuery } = get();
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      const platformOk = platformFilter === 'all' || p.platform === platformFilter;
      const statusOk = statusFilter === 'all' || p.status === statusFilter;
      const searchOk =
        q === '' || p.body.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q);
      return platformOk && statusOk && searchOk;
    });
  },
}));
