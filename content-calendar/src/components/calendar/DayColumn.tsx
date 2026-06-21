import { useState } from 'react';
import type { Post } from '../../types';
import { useStore } from '../../store/useStore';
import { isSameDay, WEEKDAY_LABELS } from '../../lib/dateUtils';
import { postsForDay } from '../../lib/scheduling';
import { CalendarContentCard } from '../CalendarContentCard';
import { PlusIcon } from '../icons';

interface Props {
  day: Date;
  posts: Post[];
  conflictIds: Set<string>;
  /** Taller column for the single-column Day view. */
  tall?: boolean;
}

/** A droppable day cell shared by Week (7 columns) and Day (1 column) views. */
export function DayColumn({ day, posts, conflictIds, tall }: Props) {
  const reschedulePost = useStore((s) => s.reschedulePost);
  const openEditorForNewPost = useStore((s) => s.openEditorForNewPost);
  const platformFilter = useStore((s) => s.platformFilter);
  const canCreate = useStore((s) => s.permissions.canCreate);
  const [dragOver, setDragOver] = useState(false);

  const dayPosts = postsForDay(posts, day);
  const isToday = isSameDay(day, new Date());

  return (
    <div
      data-testid={`day-cell-${day.getDay()}`}
      data-date={day.toISOString()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const postId = e.dataTransfer.getData('text/plain');
        if (postId) reschedulePost(postId, day);
        setDragOver(false);
      }}
      className={`flex ${tall ? 'min-h-[60vh]' : 'min-h-[180px]'} flex-col rounded-xl border bg-surface-900 transition-colors ${
        dragOver ? 'border-brand-400 bg-surface-850' : 'border-surface-700'
      }`}
    >
      <div
        className={`flex items-center justify-between border-b border-surface-700 px-2.5 py-2 ${
          isToday ? 'text-brand-400' : 'text-slate-400'
        }`}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide">
            {WEEKDAY_LABELS[(day.getDay() + 6) % 7]}
          </span>
          <span className={`text-sm font-semibold ${isToday ? 'text-brand-400' : 'text-slate-300'}`}>
            {day.getDate()}
          </span>
        </div>
        {canCreate && (
          <button
            aria-label={`Add post on ${day.toDateString()}`}
            className="rounded p-0.5 text-slate-500 transition-opacity hover:text-brand-400"
            onClick={() => {
              const at = new Date(day);
              at.setHours(9, 0, 0, 0);
              openEditorForNewPost(
                platformFilter === 'all' ? 'instagram' : platformFilter,
                at.toISOString(),
              );
            }}
          >
            <PlusIcon width={15} height={15} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2">
        {dayPosts.map((post) => (
          <CalendarContentCard key={post.id} post={post} conflicted={conflictIds.has(post.id)} />
        ))}
        {dayPosts.length === 0 && <p className="px-1 py-2 text-[11px] text-slate-600">No posts</p>}
      </div>
    </div>
  );
}
