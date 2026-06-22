import type { Post } from '../types';
import { formatTime } from '../lib/dateUtils';
import { useStore } from '../store/useStore';
import { PlatformBadge, StatusBadge } from './PlatformBadge';
import { ImageIcon, VideoIcon, AlertIcon, TagIcon, UserIcon } from './icons';

interface Props {
  post: Post;
  /** Whether this post is part of a scheduling conflict. */
  conflicted?: boolean;
}

/**
 * A draggable post card used across all calendar views. Supports multi-select
 * (checkbox), shows a conflict flag, and opens the detail drawer on click.
 *
 * Rendered as a div (not a button) so the selection checkbox can live inside it
 * without nesting interactive elements.
 */
export function CalendarContentCard({ post, conflicted }: Props) {
  const openEditor = useStore((s) => s.openEditor);
  const setDragging = useStore((s) => s.setDragging);
  const selected = useStore((s) => s.selectedIds.includes(post.id));
  const toggleSelected = useStore((s) => s.toggleSelected);
  const canEdit = useStore((s) => s.permissions.canEdit);

  const media = post.media[0];
  const latestReview = post.reviews?.[post.reviews.length - 1];

  return (
    <div
      data-testid={`post-card-${post.id}`}
      role="button"
      tabIndex={0}
      draggable
      aria-label={`Edit post: ${post.body.slice(0, 40) || 'empty draft'}`}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', post.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(post.id);
      }}
      onDragEnd={() => setDragging(null)}
      onClick={() => canEdit && openEditor(post.id)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && canEdit) {
          e.preventDefault();
          openEditor(post.id);
        }
      }}
      className={`group relative w-full cursor-grab rounded-lg border bg-surface-800 p-2 text-left transition-colors hover:border-surface-500 active:cursor-grabbing ${
        selected ? 'border-brand-400 ring-1 ring-brand-400' : 'border-surface-700'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <PlatformBadge platform={post.platform} />
        <div className="flex items-center gap-1">
          {conflicted && (
            <span className="text-status-failed" title="Scheduling conflict">
              <AlertIcon width={12} height={12} />
            </span>
          )}
          <span className="text-[10px] text-slate-500">{formatTime(post.scheduledAt)}</span>
          <input
            type="checkbox"
            aria-label="Select post"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelected(post.id)}
            className="h-3.5 w-3.5 cursor-pointer accent-brand-500"
          />
        </div>
      </div>
      <p className="line-clamp-2 text-xs leading-snug text-slate-300">
        {post.body || <span className="italic text-slate-500">Empty draft…</span>}
      </p>
      {(post.campaign || post.owner) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {post.campaign && (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded bg-surface-700 px-1.5 py-0.5 text-[10px] text-slate-300"
              title={`Campaign: ${post.campaign}`}
            >
              <TagIcon width={10} height={10} />
              <span className="truncate">{post.campaign}</span>
            </span>
          )}
          {post.owner && (
            <span
              className="inline-flex max-w-full items-center gap-1 text-[10px] text-slate-400"
              title={`Owner: ${post.owner}`}
            >
              <UserIcon width={10} height={10} />
              <span className="truncate">{post.owner}</span>
            </span>
          )}
        </div>
      )}
      {post.status === 'review' && post.reviewer && (
        <p className="mt-1.5 text-[10px] text-status-review" title={`Reviewer: ${post.reviewer}`}>
          ⟳ Awaiting {post.reviewer}
        </p>
      )}
      {post.status === 'draft' && latestReview?.decision === 'changes_requested' && (
        <p
          className="mt-1.5 truncate text-[10px] text-status-brief"
          title={latestReview.note}
        >
          ↩ Changes requested
        </p>
      )}
      <div className="mt-1.5 flex items-center justify-between">
        <StatusBadge status={post.status} />
        {media && (
          <span className="text-slate-500" title={media.label}>
            {media.type === 'video' ? <VideoIcon width={13} height={13} /> : <ImageIcon width={13} height={13} />}
          </span>
        )}
      </div>
    </div>
  );
}
