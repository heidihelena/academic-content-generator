import type { Post } from '../../types';
import { DayColumn } from './DayColumn';

interface Props {
  anchor: Date;
  posts: Post[];
  conflictIds: Set<string>;
}

/** A single, tall day column for focused day planning. */
export function DayView({ anchor, posts, conflictIds }: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <DayColumn day={anchor} posts={posts} conflictIds={conflictIds} tall />
    </div>
  );
}
