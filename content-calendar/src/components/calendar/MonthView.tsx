import { useState } from 'react';
import type { Post } from '../../types';
import { useStore } from '../../store/useStore';
import { isSameDay } from '../../lib/dateUtils';
import { postsForDay } from '../../lib/scheduling';
import { getMonthMatrix, isSameMonth } from '../../lib/calendarViews';
import { PlatformBadge } from '../PlatformBadge';

interface Props {
  anchor: Date;
  posts: Post[];
  conflictIds: Set<string>;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A 6×7 month grid. Cells are compact and droppable; each shows up to a few
 * posts (platform dot + time + snippet) with an overflow count. Clicking a post
 * opens the editor; clicking empty space on a day creates one.
 */
export function MonthView({ anchor, posts, conflictIds }: Props) {
  const weeks = getMonthMatrix(anchor);
  const reschedulePost = useStore((s) => s.reschedulePost);
  const openEditor = useStore((s) => s.openEditor);
  const openEditorForNewPost = useStore((s) => s.openEditorForNewPost);
  const platformFilter = useStore((s) => s.platformFilter);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  return (
    <div data-testid="month-grid" className="overflow-hidden rounded-xl border border-surface-700">
      <div className="grid grid-cols-7 border-b border-surface-700 bg-surface-900">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-[11px] font-medium text-slate-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const key = day.toISOString();
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date());
          const dayPosts = postsForDay(posts, day);
          const isDragOver = dragOverKey === key;
          return (
            <div
              key={key}
              data-testid={`month-cell-${day.getMonth()}-${day.getDate()}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverKey(key);
              }}
              onDragLeave={() => setDragOverKey((cur) => (cur === key ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                const postId = e.dataTransfer.getData('text/plain');
                if (postId) reschedulePost(postId, day);
                setDragOverKey(null);
              }}
              onDoubleClick={() => {
                const at = new Date(day);
                at.setHours(9, 0, 0, 0);
                openEditorForNewPost(platformFilter === 'all' ? 'instagram' : platformFilter, at.toISOString());
              }}
              className={`min-h-[96px] border-b border-r border-surface-800 p-1 ${
                inMonth ? 'bg-surface-900' : 'bg-surface-950'
              } ${isDragOver ? 'bg-surface-850 ring-1 ring-inset ring-brand-400' : ''}`}
            >
              <div className={`px-1 text-[11px] ${isToday ? 'font-bold text-brand-400' : inMonth ? 'text-slate-400' : 'text-slate-600'}`}>
                {day.getDate()}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <button
                    key={post.id}
                    data-testid={`month-post-${post.id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', post.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => openEditor(post.id)}
                    title={post.body}
                    className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] text-slate-300 hover:bg-surface-700 ${
                      conflictIds.has(post.id) ? 'ring-1 ring-status-failed/60' : ''
                    }`}
                  >
                    <PlatformBadge platform={post.platform} size={11} />
                    <span className="truncate">{post.body || 'Empty draft'}</span>
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <div className="px-1 text-[10px] text-slate-500">+{dayPosts.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
