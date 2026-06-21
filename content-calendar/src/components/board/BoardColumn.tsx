import { useState } from 'react';
import type { Post } from '../../types';
import type { BoardColumn as Column } from '../../lib/pipeline';
import { STAGE_COLOR } from '../../lib/pipeline';
import { useStore } from '../../store/useStore';
import { CalendarContentCard } from '../CalendarContentCard';

interface Props {
  column: Column;
  posts: Post[];
  conflictIds: Set<string>;
}

/**
 * A single pipeline column. Cards are dropped here to move them to this stage —
 * reusing the same native drag payload (post id) the calendar already sets, so
 * no extra wiring is needed on the card itself.
 */
export function BoardColumn({ column, posts, conflictIds }: Props) {
  const setPostStatus = useStore((s) => s.setPostStatus);
  const canEdit = useStore((s) => s.permissions.canEdit);
  const [over, setOver] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id && canEdit) setPostStatus(id, column.status);
  };

  return (
    <div
      data-testid={`board-column-${column.status}`}
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`flex w-64 shrink-0 flex-col rounded-xl border bg-surface-900/50 transition-colors ${
        over ? 'border-brand-400 bg-surface-800/60' : 'border-surface-800'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-surface-800 px-3 py-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: STAGE_COLOR[column.status] }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200">{column.label}</p>
          <p className="truncate text-[10px] text-slate-500">{column.description}</p>
        </div>
        <span className="rounded-full bg-surface-800 px-2 py-0.5 text-[11px] text-slate-400">
          {posts.length}
        </span>
      </div>

      <div className="flex min-h-[6rem] flex-1 flex-col gap-2 p-2">
        {posts.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-slate-600">
            Drop a card here
          </p>
        ) : (
          posts.map((post) => (
            <CalendarContentCard key={post.id} post={post} conflicted={conflictIds.has(post.id)} />
          ))
        )}
      </div>
    </div>
  );
}
