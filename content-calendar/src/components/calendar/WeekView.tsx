import type { Post } from '../../types';
import { getWeekDays } from '../../lib/dateUtils';
import { DayColumn } from './DayColumn';

interface Props {
  anchor: Date;
  posts: Post[];
  conflictIds: Set<string>;
}

/** Seven Monday-start day columns. */
export function WeekView({ anchor, posts, conflictIds }: Props) {
  const days = getWeekDays(anchor);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => (
        <DayColumn key={day.toISOString()} day={day} posts={posts} conflictIds={conflictIds} />
      ))}
    </div>
  );
}
