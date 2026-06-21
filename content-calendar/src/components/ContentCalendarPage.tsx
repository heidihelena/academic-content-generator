import { useState } from 'react';
import { useStore } from '../store/useStore';
import { conflictingIds, detectConflicts } from '../lib/conflicts';
import { FilterSidebar } from './FilterSidebar';
import { CalendarToolbar } from './calendar/CalendarToolbar';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import { BulkActionBar } from './BulkActionBar';
import { ConflictWarningModal } from './ConflictWarningModal';
import { EmptyState } from './ui/States';
import { CalendarIcon } from './icons';

/**
 * The calendar workspace: toolbar (view switcher / date nav / search / create),
 * a filter sidebar, the Month/Week/Day canvas, a bulk-action bar, and the
 * conflict modal. Composition mirrors the agreed component architecture.
 */
export function ContentCalendarPage() {
  const view = useStore((s) => s.view);
  const weekAnchor = useStore((s) => s.weekAnchor);
  const allPosts = useStore((s) => s.posts);
  const filteredPosts = useStore((s) => s.filteredPosts);
  const platformFilter = useStore((s) => s.platformFilter);
  const statusFilter = useStore((s) => s.statusFilter);
  const searchQuery = useStore((s) => s.searchQuery);

  const [showConflicts, setShowConflicts] = useState(false);

  const anchor = new Date(weekAnchor);
  const posts = filteredPosts();
  // Conflicts are computed over all posts so a flag still shows even if the
  // conflicting partner is hidden by a filter.
  const conflicts = detectConflicts(allPosts);
  const conflictIds = conflictingIds(allPosts);
  const filtersActive = platformFilter !== 'all' || statusFilter !== 'all' || searchQuery !== '';

  return (
    <section aria-label="Content calendar" className="space-y-4">
      <CalendarToolbar conflicts={conflicts} onShowConflicts={() => setShowConflicts(true)} />

      <div className="flex flex-col gap-4 lg:flex-row">
        <FilterSidebar />
        <div className="min-w-0 flex-1">
          {posts.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon width={28} height={28} />}
              title={filtersActive ? 'No posts match these filters' : 'No posts scheduled yet'}
              description={
                filtersActive
                  ? 'Try clearing a filter to see more of your calendar.'
                  : 'Create your first post to start planning.'
              }
            />
          ) : view === 'month' ? (
            <MonthView anchor={anchor} posts={posts} conflictIds={conflictIds} />
          ) : view === 'day' ? (
            <DayView anchor={anchor} posts={posts} conflictIds={conflictIds} />
          ) : (
            <WeekView anchor={anchor} posts={posts} conflictIds={conflictIds} />
          )}
        </div>
      </div>

      <BulkActionBar />
      <ConflictWarningModal open={showConflicts} onClose={() => setShowConflicts(false)} conflicts={conflicts} />
    </section>
  );
}
