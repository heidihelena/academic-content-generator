import { useMemo, useState } from 'react';
import type { MediaAttachment, Platform, PostDraft, PostStatus } from '../types';
import { useStore } from '../store/useStore';
import { PLATFORMS, getPlatformMeta } from '../lib/platforms';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/dateUtils';
import { createId } from '../lib/id';
import { Modal } from './ui/Modal';
import { PostPreview } from './PostPreview';
import { PLATFORM_GLYPHS, ImageIcon, VideoIcon, TrashIcon } from './icons';

const STATUS_OPTIONS: PostStatus[] = ['draft', 'scheduled', 'published', 'failed'];

/**
 * Create/edit modal for a single post. Includes platform selection, caption with
 * live character count + limit enforcement, schedule date/time, status, a media
 * placeholder, and a live per-platform preview.
 */
export function PostEditorModal() {
  const isOpen = useStore((s) => s.isEditorOpen);
  const editingPostId = useStore((s) => s.editingPostId);
  const posts = useStore((s) => s.posts);
  const accounts = useStore((s) => s.accounts);
  const savePost = useStore((s) => s.savePost);
  const deletePost = useStore((s) => s.deletePost);
  const closeEditor = useStore((s) => s.closeEditor);

  const existing = posts.find((p) => p.id === editingPostId);

  // Local draft state, seeded from the post being edited. Keyed by post id so the
  // form fully resets when a different post is opened.
  const [draft, setDraft] = useState<PostDraft>(() => seed());
  const [seededFor, setSeededFor] = useState<string | null>(editingPostId);

  function seed(): PostDraft {
    if (existing) {
      return {
        id: existing.id,
        platform: existing.platform,
        body: existing.body,
        scheduledAt: existing.scheduledAt,
        status: existing.status,
        media: existing.media,
      };
    }
    return {
      platform: 'instagram',
      body: '',
      scheduledAt: new Date().toISOString(),
      status: 'draft',
      media: [],
    };
  }

  // Re-seed when the open post changes (cheap, render-time reconciliation).
  if (editingPostId !== seededFor) {
    setSeededFor(editingPostId);
    setDraft(seed());
  }

  const meta = getPlatformMeta(draft.platform);
  const charCount = draft.body.length;
  const overLimit = charCount > meta.characterLimit;
  const account = accounts.find((a) => a.platform === draft.platform);

  const update = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addMedia = (type: MediaAttachment['type']) =>
    update('media', [
      ...draft.media,
      { id: createId('media'), type, label: type === 'video' ? 'Video placeholder' : 'Image placeholder' },
    ]);

  const removeMedia = (id: string) =>
    update('media', draft.media.filter((m) => m.id !== id));

  const canSave = useMemo(
    () => draft.scheduledAt && !overLimit,
    [draft.scheduledAt, overLimit],
  );

  return (
    <Modal
      open={isOpen}
      title={existing ? 'Edit post' : 'New post'}
      onClose={closeEditor}
      widthClass="max-w-4xl"
      footer={
        <>
          {existing && (
            <button
              className="btn-danger mr-auto"
              onClick={() => deletePost(existing.id)}
            >
              <TrashIcon width={15} height={15} /> Delete
            </button>
          )}
          <button className="btn-secondary" onClick={closeEditor}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!canSave} onClick={() => savePost(draft)}>
            Save post
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* --- Form --- */}
        <div className="space-y-4">
          <div>
            <span className="label">Platform</span>
            <div className="flex gap-1.5">
              {PLATFORMS.map((p) => {
                const Glyph = PLATFORM_GLYPHS[p];
                const active = draft.platform === p;
                const c = getPlatformMeta(p).color;
                return (
                  <button
                    key={p}
                    onClick={() => update('platform', p as Platform)}
                    aria-pressed={active}
                    className={`btn flex-1 py-2 ${active ? 'bg-surface-600' : 'bg-surface-800 hover:bg-surface-700'}`}
                    style={active ? { color: c } : undefined}
                  >
                    <Glyph width={16} height={16} />
                    <span className="text-xs">{getPlatformMeta(p).name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="post-body" className="label">
                Caption
              </label>
              <span
                data-testid="char-count"
                className={`text-[11px] ${overLimit ? 'text-status-failed' : 'text-slate-500'}`}
              >
                {charCount} / {meta.characterLimit}
              </span>
            </div>
            <textarea
              id="post-body"
              rows={6}
              className="input resize-none"
              placeholder="Write your caption…"
              value={draft.body}
              onChange={(e) => update('body', e.target.value)}
            />
            {overLimit && (
              <p className="mt-1 text-[11px] text-status-failed">
                Caption exceeds the {meta.name} limit by {charCount - meta.characterLimit} characters.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="post-when" className="label">
                Schedule
              </label>
              <input
                id="post-when"
                type="datetime-local"
                className="input"
                value={toDateTimeLocalValue(draft.scheduledAt)}
                onChange={(e) => update('scheduledAt', fromDateTimeLocalValue(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="post-status" className="label">
                Status
              </label>
              <select
                id="post-status"
                className="input"
                value={draft.status}
                onChange={(e) => update('status', e.target.value as PostStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="label">Media</span>
            <div className="flex flex-wrap gap-2">
              {draft.media.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-600 bg-surface-800 px-2.5 py-1.5 text-xs text-slate-300"
                >
                  {m.type === 'video' ? <VideoIcon width={14} height={14} /> : <ImageIcon width={14} height={14} />}
                  {m.label}
                  <button aria-label="Remove media" onClick={() => removeMedia(m.id)} className="text-slate-500 hover:text-status-failed">
                    <TrashIcon width={13} height={13} />
                  </button>
                </span>
              ))}
              <button className="btn-secondary py-1.5 text-xs" onClick={() => addMedia('image')}>
                <ImageIcon width={14} height={14} /> Add image
              </button>
              <button className="btn-secondary py-1.5 text-xs" onClick={() => addMedia('video')}>
                <VideoIcon width={14} height={14} /> Add video
              </button>
            </div>
            {/* Real media upload would POST to a storage service and store the URL. */}
          </div>
        </div>

        {/* --- Live preview --- */}
        <div>
          <span className="label">Preview</span>
          <PostPreview
            platform={draft.platform}
            body={draft.body}
            account={account}
            hasMedia={draft.media.length > 0}
            mediaLabel={draft.media[0]?.label}
          />
        </div>
      </div>
    </Modal>
  );
}
