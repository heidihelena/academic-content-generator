import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  formatWeekRange,
  getWeekDays,
  isSameDay,
  WEEKDAY_LABELS,
} from '../lib/dateUtils';
import { postsForDay } from '../lib/scheduling';
import { PostCard } from './PostCard';
import { Filters } from './Filters';
import { EmptyState } from './ui/States';
import { ChevronLeft, ChevronRight, PlusIcon, CalendarIcon } from './icons';

/**
 * The weekly calendar — the product's home view.
 *
 * Renders 7 day columns, each a drop target. Drag-and-drop uses native HTML5
 * events; the actual reschedule math lives in the pure `scheduling` module and
 * is dispatched through the store.
 */
export function WeeklyCalendar() {
  const weekAnchor = useStore((s) => s.weekAnchor);
  const goToWeek = useStore((s) => s.goToWeek);
  const goToToday = useStore((s) => s.goToToday);
  const filteredPosts = useStore((s) => s.filteredPosts);
  const platformFilter = useStore((s) => s.platformFilter);
  const statusFilter = useStore((s) => s.statusFilter);
  const reschedulePost = useStore((s) => s.reschedulePost);
  const openEditor = useStore((s) => s.openEditor);
  const openEditorForNewPost = useStore((s) => s.openEditorForNewPost);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const anchorDate = new Date(weekAnchor);
  const days = getWeekDays(anchorDate);
  // Recompute on each render; cheap and keeps the view reactive to filters.
  const posts = filteredPosts();
  const today = new Date();

  const handleDrop = (day: Date, e: React.DragEvent) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain') || draggingId;
    if (postId) reschedulePost(postId, day);
    setDraggingId(null);
    setDragOverDay(null);
  };

  const hasAnyPosts = posts.length > 0;
  const filtersActive = platformFilter !== 'all' || statusFilter !== 'all';

  return (
    <section aria-label="Weekly calendar" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary px-2 py-1.5" aria-label="Previous week"
            onClick={() => goToWeek(new Date(anchorDate.getTime() - 7 * 86400000))}>
            <ChevronLeft />
          </button>
          <button className="btn-secondary px-2 py-1.5" aria-label="Next week"
            onClick={() => goToWeek(new Date(anchorDate.getTime() + 7 * 86400000))}>
            <ChevronRight />
          </button>
          <button className="btn-ghost text-xs" onClick={goToToday}>
            Today
          </button>
          <h2 className="ml-1 text-sm font-semibold text-slate-200" data-testid="week-range">
            {formatWeekRange(anchorDate)}
          </h2>
        </div>
        <Filters />
      </div>

      {!hasAnyPosts && (
        <EmptyState
          icon={<CalendarIcon width={28} height={28} />}
          title={filtersActive ? 'No posts match these filters' : 'No posts scheduled yet'}
          description={
            filtersActive
              ? 'Try clearing a filter to see more of your calendar.'
              : 'Create your first post to start planning your week.'
          }
        />
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const dayPosts = postsForDay(posts, day);
          const isToday = isSameDay(day, today);
          const dayKey = day.toISOString();
          const isDragOver = dragOverDay === dayKey;
          return (
            <div
              key={dayKey}
              data-testid={`day-cell-${day.getDay()}`}
              data-date={dayKey}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDay(dayKey);
              }}
              onDragLeave={() => setDragOverDay((cur) => (cur === dayKey ? null : cur))}
              onDrop={(e) => handleDrop(day, e)}
              className={`flex min-h-[180px] flex-col rounded-xl border bg-surface-900 transition-colors ${
                isDragOver ? 'border-brand-400 bg-surface-850' : 'border-surface-700'
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
                <button
                  aria-label={`Add post on ${day.toDateString()}`}
                  className="rounded p-0.5 text-slate-500 opacity-0 transition-opacity hover:text-brand-400 focus:opacity-100 group-hover:opacity-100"
                  // Default new posts to 9:00 AM on the chosen day, current platform filter (or instagram).
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
              </div>

              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {dayPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={openEditor}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                  />
                ))}
                {dayPosts.length === 0 && (
                  <p className="px-1 py-2 text-[11px] text-slate-600">No posts</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
