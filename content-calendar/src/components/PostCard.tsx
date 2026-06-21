import type { Post } from '../types';
import { formatTime } from '../lib/dateUtils';
import { PlatformBadge, StatusBadge } from './PlatformBadge';
import { ImageIcon, VideoIcon } from './icons';

interface PostCardProps {
  post: Post;
  onClick: (postId: string) => void;
  onDragStart: (postId: string) => void;
  onDragEnd: () => void;
}

/** A compact, draggable post card rendered inside a calendar day cell. */
export function PostCard({ post, onClick, onDragStart, onDragEnd }: PostCardProps) {
  const media = post.media[0];
  return (
    <button
      type="button"
      draggable
      data-testid={`post-card-${post.id}`}
      onDragStart={(e) => {
        // Store the post id so the day cell can read it on drop.
        e.dataTransfer.setData('text/plain', post.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(post.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(post.id)}
      className="group w-full cursor-grab rounded-lg border border-surface-700 bg-surface-800 p-2 text-left transition-colors hover:border-surface-500 active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <PlatformBadge platform={post.platform} />
        <span className="text-[10px] text-slate-500">{formatTime(post.scheduledAt)}</span>
      </div>
      <p className="line-clamp-2 text-xs leading-snug text-slate-300">
        {post.body || <span className="italic text-slate-500">Empty draft…</span>}
      </p>
      <div className="mt-1.5 flex items-center justify-between">
        <StatusBadge status={post.status} />
        {media && (
          <span className="text-slate-500" title={media.label}>
            {media.type === 'video' ? (
              <VideoIcon width={13} height={13} />
            ) : (
              <ImageIcon width={13} height={13} />
            )}
          </span>
        )}
      </div>
    </button>
  );
}
