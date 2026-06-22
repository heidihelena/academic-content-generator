import { useMemo, useRef, useState } from 'react';
import type { MediaAttachment, Platform, PostDraft, PostStatus, Source } from '../types';
import { useStore } from '../store/useStore';
import { PLATFORMS, getPlatformMeta } from '../lib/platforms';
import { STAGE_ORDER, STAGE_META } from '../lib/pipeline';
import {
  EVIDENCE_ORDER,
  EVIDENCE_META,
  evidenceExpectsSource,
  hasSourceLink,
  normalizeDoi,
  sourceLabel,
} from '../lib/evidence';
import { analyzeReadability, readabilityVerdict } from '../lib/readability';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/dateUtils';
import { createId } from '../lib/id';
import { Drawer } from './ui/Drawer';
import { Spinner } from './ui/Spinner';
import { PostPreview } from './PostPreview';
import { PLATFORM_GLYPHS, ImageIcon, VideoIcon, TrashIcon, CheckIcon, BookIcon, AlertIcon } from './icons';

const STAGE_OPTIONS: PostStatus[] = [...STAGE_ORDER, 'failed'];

/**
 * Create/edit panel for a single post, rendered as a right-side drawer so the
 * calendar stays visible while editing. Includes platform selection, caption
 * with live character count + limit enforcement, schedule date/time, status,
 * owner + campaign, a media placeholder, and a live per-platform preview.
 */
export function PostEditorDrawer() {
  const isOpen = useStore((s) => s.isEditorOpen);
  const editingPostId = useStore((s) => s.editingPostId);
  const posts = useStore((s) => s.posts);
  const accounts = useStore((s) => s.accounts);
  const savePost = useStore((s) => s.savePost);
  const deletePost = useStore((s) => s.deletePost);
  const closeEditor = useStore((s) => s.closeEditor);
  const uploadMedia = useStore((s) => s.uploadMedia);
  const approvePost = useStore((s) => s.approvePost);
  const requestChanges = useStore((s) => s.requestChanges);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [showNote, setShowNote] = useState(false);

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
        owner: existing.owner,
        campaign: existing.campaign,
        brief: existing.brief,
        audience: existing.audience,
        theme: existing.theme,
        hook: existing.hook,
        source: existing.source,
        evidenceLevel: existing.evidenceLevel,
        reviewer: existing.reviewer,
      };
    }
    return {
      platform: 'instagram',
      body: '',
      scheduledAt: new Date().toISOString(),
      status: 'brief',
      media: [],
    };
  }

  // Re-seed when the open post changes (cheap, render-time reconciliation).
  if (editingPostId !== seededFor) {
    setSeededFor(editingPostId);
    setDraft(seed());
    setChangeNote('');
    setShowNote(false);
  }

  // People to suggest as reviewers: owners/reviewers already used elsewhere.
  const people = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      if (p.owner) set.add(p.owner);
      if (p.reviewer) set.add(p.reviewer);
    }
    return [...set].sort();
  }, [posts]);

  const latestReview = existing?.reviews?.[existing.reviews.length - 1];

  const onApprove = () => {
    if (!existing) return;
    approvePost(existing.id, draft.reviewer);
    closeEditor();
  };

  const onRequestChanges = () => {
    if (!existing || !changeNote.trim()) return;
    requestChanges(existing.id, changeNote.trim(), draft.reviewer);
    closeEditor();
  };

  const meta = getPlatformMeta(draft.platform);
  const charCount = draft.body.length;
  const overLimit = charCount > meta.characterLimit;
  const account = accounts.find((a) => a.platform === draft.platform);

  const update = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /** Patch a single field of the structured source; clears it when fully empty. */
  const updateSource = <K extends keyof Source>(key: K, value: Source[K]) =>
    setDraft((d) => {
      const next: Source = { ...d.source, [key]: value };
      const empty = !next.title && !next.authors && !next.year && !next.venue && !next.doi && !next.url;
      return { ...d, source: empty ? undefined : next };
    });

  // Plain-language check on the live copy.
  const readability = useMemo(() => analyzeReadability(draft.body), [draft.body]);
  const verdict = readabilityVerdict(readability);
  // A peer-reviewed / preliminary claim should link its source.
  const missingSource = evidenceExpectsSource(draft.evidenceLevel) && !hasSourceLink(draft.source);

  const addMedia = (type: MediaAttachment['type']) =>
    update('media', [
      ...draft.media,
      { id: createId('media'), type, label: type === 'video' ? 'Video placeholder' : 'Image placeholder' },
    ]);

  const removeMedia = (id: string) =>
    update('media', draft.media.filter((m) => m.id !== id));

  // Real upload: send the file to the storage backend (or an object URL offline)
  // and attach the returned media (with a usable URL) to the draft.
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const media = await uploadMedia(file);
      update('media', [...draft.media, media]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const canSave = useMemo(
    () => draft.scheduledAt && !overLimit,
    [draft.scheduledAt, overLimit],
  );

  return (
    <Drawer
      open={isOpen}
      title={existing ? 'Edit post' : 'New post'}
      onClose={closeEditor}
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
          <label htmlFor="post-brief" className="label">
            Brief <span className="font-normal text-slate-500">— why this post exists</span>
          </label>
          <textarea
            id="post-brief"
            rows={2}
            className="input resize-none"
            placeholder="Objective / goal for this post…"
            value={draft.brief ?? ''}
            onChange={(e) => update('brief', e.target.value || undefined)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="post-audience" className="label">
              Audience
            </label>
            <input
              id="post-audience"
              type="text"
              className="input"
              placeholder="Who is this for?"
              value={draft.audience ?? ''}
              onChange={(e) => update('audience', e.target.value || undefined)}
            />
          </div>
          <div>
            <label htmlFor="post-theme" className="label">
              Theme
            </label>
            <input
              id="post-theme"
              type="text"
              className="input"
              placeholder="Content pillar / topic"
              value={draft.theme ?? ''}
              onChange={(e) => update('theme', e.target.value || undefined)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="post-hook" className="label">
            Hook <span className="font-normal text-slate-500">— the opening line</span>
          </label>
          <input
            id="post-hook"
            type="text"
            className="input"
            placeholder="The scroll-stopping first line…"
            value={draft.hook ?? ''}
            onChange={(e) => update('hook', e.target.value || undefined)}
          />
        </div>

        {/* Evidence & source — the academic spine: what claim, backed by what. */}
        <div data-testid="evidence-section" className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/40 p-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <BookIcon width={15} height={15} />
            <span className="text-xs font-semibold">Evidence &amp; source</span>
          </div>

          <div>
            <span className="label">How strong is the claim?</span>
            <div className="flex gap-1.5">
              {EVIDENCE_ORDER.map((level) => {
                const m = EVIDENCE_META[level];
                const active = draft.evidenceLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update('evidenceLevel', active ? undefined : level)}
                    className={`btn flex-1 py-1.5 text-[11px] ${active ? 'bg-surface-600' : 'bg-surface-800 hover:bg-surface-700'}`}
                    style={active ? { color: m.color } : undefined}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            {draft.evidenceLevel && (
              <p className="mt-1 text-[11px] text-slate-500">{EVIDENCE_META[draft.evidenceLevel].description}</p>
            )}
          </div>

          <div>
            <label htmlFor="source-link" className="label">
              DOI or link
            </label>
            <input
              id="source-link"
              type="text"
              className="input"
              placeholder="10.1038/s41586-… or https://…"
              value={draft.source?.doi ?? draft.source?.url ?? ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                // A DOI-looking value goes in `doi`; anything else is a URL.
                if (/^(https?:\/\/(dx\.)?doi\.org\/|doi:|10\.)/i.test(v)) {
                  setDraft((d) => ({
                    ...d,
                    source: v ? { ...d.source, doi: normalizeDoi(v), url: undefined } : undefined,
                  }));
                } else {
                  setDraft((d) => ({
                    ...d,
                    source: v ? { ...d.source, url: v, doi: undefined } : { ...d.source, url: undefined },
                  }));
                }
              }}
            />
          </div>

          <input
            type="text"
            className="input"
            placeholder="Title of the work"
            aria-label="Source title"
            value={draft.source?.title ?? ''}
            onChange={(e) => updateSource('title', e.target.value || undefined)}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              className="input col-span-2"
              placeholder="Authors"
              aria-label="Source authors"
              value={draft.source?.authors ?? ''}
              onChange={(e) => updateSource('authors', e.target.value || undefined)}
            />
            <input
              type="number"
              className="input"
              placeholder="Year"
              aria-label="Source year"
              value={draft.source?.year ?? ''}
              onChange={(e) => updateSource('year', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <input
            type="text"
            className="input"
            placeholder="Venue (journal, conference, repository)"
            aria-label="Source venue"
            value={draft.source?.venue ?? ''}
            onChange={(e) => updateSource('venue', e.target.value || undefined)}
          />

          {missingSource && (
            <p data-testid="missing-source" className="flex items-center gap-1.5 text-[11px] text-status-brief">
              <AlertIcon width={13} height={13} />
              This is marked {EVIDENCE_META[draft.evidenceLevel!].label.toLowerCase()} but has no DOI or link.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="post-body" className="label">
              Script / Copy
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

          {/* Plain-language check — nudges researchers toward accessible writing. */}
          {verdict.tone !== 'empty' && (
            <div
              data-testid="readability"
              className={`mt-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
                verdict.tone === 'good'
                  ? 'border-status-published/40 bg-status-published/10 text-status-published'
                  : 'border-status-brief/40 bg-status-brief/10 text-status-brief'
              }`}
            >
              <span className="font-semibold">Plain-language check · grade {readability.gradeLevel}</span>
              {' — '}
              {verdict.message}
              {readability.complexWords.length > 0 && (
                <span className="mt-1 block text-slate-400">
                  Consider simpler words for:{' '}
                  <span className="text-slate-300">
                    {readability.complexWords.slice(0, 6).join(', ')}
                  </span>
                </span>
              )}
            </div>
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
              Stage
            </label>
            <select
              id="post-status"
              className="input"
              value={draft.status}
              onChange={(e) => update('status', e.target.value as PostStatus)}
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STAGE_META[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
          <span className="font-medium text-slate-300">{STAGE_META[draft.status].label}:</span>{' '}
          {STAGE_META[draft.status].hint}
        </p>

        {/* Changes were requested and the card bounced back to Drafting. */}
        {latestReview?.decision === 'changes_requested' && draft.status === 'draft' && (
          <div
            data-testid="changes-requested-note"
            className="rounded-lg border border-status-brief/40 bg-status-brief/10 px-3 py-2 text-[11px] leading-relaxed text-status-brief"
          >
            <span className="font-semibold">Changes requested</span>
            {latestReview.reviewer ? ` by ${latestReview.reviewer}` : ''}: {latestReview.note}
          </div>
        )}

        {/* Review gate — only while the post is in Review. */}
        {existing && draft.status === 'review' && (
          <div
            data-testid="review-panel"
            className="space-y-3 rounded-lg border border-status-review/40 bg-status-review/5 p-3"
          >
            <div>
              <label htmlFor="post-reviewer" className="label">
                Reviewer
              </label>
              <input
                id="post-reviewer"
                type="text"
                list="reviewer-suggestions"
                className="input"
                placeholder="Assign a reviewer…"
                value={draft.reviewer ?? ''}
                onChange={(e) => update('reviewer', e.target.value || undefined)}
              />
              <datalist id="reviewer-suggestions">
                {people.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            {/* Accuracy check: show the evidence level + source to verify. */}
            <div className="rounded-md bg-surface-900/60 px-2.5 py-2 text-[11px]">
              {draft.evidenceLevel ? (
                <p>
                  <span className="font-semibold" style={{ color: EVIDENCE_META[draft.evidenceLevel].color }}>
                    {EVIDENCE_META[draft.evidenceLevel].label}
                  </span>
                  {hasSourceLink(draft.source) || draft.source?.title ? (
                    <span className="text-slate-400"> · {sourceLabel(draft.source)}</span>
                  ) : null}
                </p>
              ) : (
                <p className="text-slate-500">No evidence level set.</p>
              )}
              {missingSource && (
                <p className="mt-1 flex items-center gap-1.5 text-status-brief">
                  <AlertIcon width={12} height={12} /> Verify accuracy — no source is linked.
                </p>
              )}
            </div>

            {showNote ? (
              <div className="space-y-2">
                <label htmlFor="change-note" className="label">
                  What needs to change?
                </label>
                <textarea
                  id="change-note"
                  rows={3}
                  className="input resize-none"
                  placeholder="Describe the changes needed…"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="btn-primary py-1.5 text-xs"
                    disabled={!changeNote.trim()}
                    onClick={onRequestChanges}
                  >
                    Send back to Drafting
                  </button>
                  <button className="btn-ghost py-1.5 text-xs" onClick={() => setShowNote(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button className="btn-primary py-1.5 text-xs" onClick={onApprove}>
                  <CheckIcon width={14} height={14} /> Approve
                </button>
                <button className="btn-secondary py-1.5 text-xs" onClick={() => setShowNote(true)}>
                  Request changes
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="post-owner" className="label">
              Owner
            </label>
            <input
              id="post-owner"
              type="text"
              className="input"
              placeholder="Who's responsible?"
              value={draft.owner ?? ''}
              onChange={(e) => update('owner', e.target.value || undefined)}
            />
          </div>
          <div>
            <label htmlFor="post-campaign" className="label">
              Campaign
            </label>
            <input
              id="post-campaign"
              type="text"
              className="input"
              placeholder="e.g. Spring launch"
              value={draft.campaign ?? ''}
              onChange={(e) => update('campaign', e.target.value || undefined)}
            />
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
            {/* Real upload: stores the file via the backend (or an object URL
                offline) and attaches a usable URL — required for Instagram. */}
            <button
              className="btn-secondary py-1.5 text-xs"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Spinner size={14} label="Uploading" /> : <ImageIcon width={14} height={14} />}
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          {uploadError && <p className="mt-1 text-[11px] text-status-failed">{uploadError}</p>}
        </div>

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
    </Drawer>
  );
}
