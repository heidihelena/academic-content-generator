import { useMemo, useRef, useState } from 'react';
import type { MediaAttachment, PostDraft, Source } from '../../types';
import { useStore } from '../../store/useStore';
import { getPlatformMeta } from '../../lib/platforms';
import { evidenceExpectsSource, hasSourceLink, normalizeDoi } from '../../lib/evidence';
import { analyzeReadability, readabilityVerdict } from '../../lib/readability';
import { analyzeReach, reachVerdict } from '../../lib/reach';
import { splitIntoThread } from '../../lib/thread';
import { createId } from '../../lib/id';

export type ConfirmKind = 'publish' | 'delete' | null;

/**
 * The Post Editor's view-model. Owns every piece of behaviour the drawer needs —
 * store wiring, the local draft + re-seeding, derived analytics (readability,
 * reach, thread split, missing-source), and the action handlers — so the drawer
 * and its section components stay purely presentational. Nothing here renders.
 */
export function usePostEditor() {
  const isOpen = useStore((s) => s.isEditorOpen);
  const editingPostId = useStore((s) => s.editingPostId);
  const posts = useStore((s) => s.posts);
  const accounts = useStore((s) => s.accounts);
  const savePost = useStore((s) => s.savePost);
  const deletePost = useStore((s) => s.deletePost);
  const publishPost = useStore((s) => s.publishPost);
  const publishingId = useStore((s) => s.publishingId);
  const publishError = useStore((s) => s.publishError);
  const closeEditor = useStore((s) => s.closeEditor);
  const uploadMedia = useStore((s) => s.uploadMedia);
  const approvePost = useStore((s) => s.approvePost);
  const requestChanges = useStore((s) => s.requestChanges);
  const createThread = useStore((s) => s.createThread);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  const existing = posts.find((p) => p.id === editingPostId);

  // Local draft, seeded from the post being edited. Keyed by post id so the form
  // fully resets when a different post opens.
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
    return { platform: 'instagram', body: '', scheduledAt: new Date().toISOString(), status: 'brief', media: [] };
  }

  // Re-seed when the open post changes (cheap, render-time reconciliation).
  if (editingPostId !== seededFor) {
    setSeededFor(editingPostId);
    setDraft(seed());
    setChangeNote('');
    setShowNote(false);
    setConfirm(null);
  }

  const update = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /** Patch a single field of the structured source; clears it when fully empty. */
  const updateSource = <K extends keyof Source>(key: K, value: Source[K]) =>
    setDraft((d) => {
      const next: Source = { ...d.source, [key]: value };
      const empty = !next.title && !next.authors && !next.year && !next.venue && !next.doi && !next.url;
      return { ...d, source: empty ? undefined : next };
    });

  /** A DOI-looking value goes in `doi` (normalized); anything else is a URL. */
  const setSourceLink = (raw: string) => {
    const v = raw.trim();
    if (/^(https?:\/\/(dx\.)?doi\.org\/|doi:|10\.)/i.test(v)) {
      setDraft((d) => ({ ...d, source: v ? { ...d.source, doi: normalizeDoi(v), url: undefined } : undefined }));
    } else {
      setDraft((d) => ({ ...d, source: v ? { ...d.source, url: v, doi: undefined } : { ...d.source, url: undefined } }));
    }
  };

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
  const meta = getPlatformMeta(draft.platform);
  const charCount = draft.body.length;
  const overLimit = charCount > meta.characterLimit;
  const account = accounts.find((a) => a.platform === draft.platform);

  // Derived previews on the live copy.
  const readability = useMemo(() => analyzeReadability(draft.body), [draft.body]);
  const verdict = readabilityVerdict(readability);
  const reachFindings = useMemo(
    () => analyzeReach({ platform: draft.platform, body: draft.body, mediaCount: draft.media.length }),
    [draft.platform, draft.body, draft.media.length],
  );
  const reach = reachVerdict(reachFindings);
  const threadParts = useMemo(() => splitIntoThread(draft.body, meta.characterLimit), [draft.body, meta.characterLimit]);
  const missingSource = evidenceExpectsSource(draft.evidenceLevel) && !hasSourceLink(draft.source);

  const addMedia = (type: MediaAttachment['type']) =>
    update('media', [
      ...draft.media,
      { id: createId('media'), type, label: type === 'video' ? 'Video placeholder' : 'Image placeholder' },
    ]);

  const removeMedia = (id: string) => update('media', draft.media.filter((m) => m.id !== id));

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      update('media', [...draft.media, await uploadMedia(file)]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

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

  const doPublish = async () => {
    if (!existing) return;
    if (await publishPost(existing.id)) closeEditor();
  };

  const accountConnected = account?.status === 'connected';
  const isPublishing = publishingId === existing?.id;
  const isPublished = existing?.status === 'published';
  const canSave = Boolean(draft.scheduledAt) && !overLimit;
  const canPublish = Boolean(existing) && accountConnected && !overLimit && draft.body.trim().length > 0;

  return {
    // identity / open state
    isOpen,
    existing,
    isNew: !existing,
    draft,
    // derived
    meta,
    account,
    charCount,
    overLimit,
    people,
    latestReview,
    readability,
    verdict,
    reachFindings,
    reach,
    threadParts,
    missingSource,
    hasBody: draft.body.trim().length > 0,
    showThread: threadParts.length > 1,
    showReview: Boolean(existing) && draft.status === 'review',
    showChangesNote: latestReview?.decision === 'changes_requested' && draft.status === 'draft',
    // publish/save state
    accountConnected,
    publishTarget: account?.handle ?? meta.name,
    publishError,
    publishingId,
    isPublishing,
    isPublished,
    canSave,
    canPublish,
    // upload + note + confirm state
    fileInputRef,
    uploading,
    uploadError,
    changeNote,
    setChangeNote,
    showNote,
    setShowNote,
    confirm,
    setConfirm,
    // actions
    update,
    updateSource,
    setSourceLink,
    addMedia,
    removeMedia,
    onPickFile,
    onApprove,
    onRequestChanges,
    doPublish,
    savePost,
    deletePost,
    createThread,
    closeEditor,
  };
}
