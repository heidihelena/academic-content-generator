import { useEffect, useState } from 'react';
import { contentClient } from '../content/contentClient';
import type { CommentEntry } from '../content/contentTypes';
import { Spinner } from './ui/Spinner';

/**
 * The collaboration thread on a content item — review notes, hand-off context,
 * decisions. Loads the item's comments and lets you add one. Lives in the
 * variant drawer, which already carries the item.
 */
export function CommentsSection({ itemId }: { itemId: string }) {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    contentClient
      .listComments(itemId)
      .then((c) => active && setComments(c))
      .catch(() => active && setComments([]));
    return () => {
      active = false;
    };
  }, [itemId]);

  const add = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const entry = await contentClient.addComment(itemId, body.trim());
      setComments((prev) => [...prev, entry]);
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add comment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-surface-700 pt-4" data-testid="comments-section">
      <p className="text-xs font-semibold text-slate-300">Comments</p>

      {comments.length > 0 ? (
        <ul className="space-y-2" data-testid="comments-list">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md bg-surface-900/60 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-medium text-slate-400">{c.author ?? 'you'}</span>
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-200">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-slate-500">No comments yet.</p>
      )}

      <div className="space-y-1.5">
        <textarea
          className="input w-full text-xs"
          rows={2}
          placeholder="Add a note…"
          aria-label="Add a comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn-secondary py-1 text-xs" disabled={busy || !body.trim()} onClick={add}>
          {busy ? <Spinner size={12} label="Posting" /> : null} Comment
        </button>
      </div>

      {error && <p className="text-xs text-status-overdue">{error}</p>}
    </div>
  );
}
