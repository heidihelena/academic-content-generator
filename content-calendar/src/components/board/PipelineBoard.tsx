import { useStore } from '../../store/useStore';
import { BOARD_COLUMNS } from '../../lib/pipeline';
import { conflictingIds } from '../../lib/conflicts';
import { Filters } from '../Filters';
import { SearchBar } from '../calendar/SearchBar';
import { BulkActionBar } from '../BulkActionBar';
import { BoardColumn } from './BoardColumn';
import { PlusIcon } from '../icons';

/**
 * The editorial pipeline board — the home view. Columns are the workflow stages
 * (Brief → Drafting → Review → Approved → Scheduled → Published → Learn); drag a
 * card from one column to the next to move it through the pipeline.
 *
 * Platform + search filters apply; the status filter is intentionally ignored
 * here because the columns already represent status.
 */
export function PipelineBoard() {
  const allPosts = useStore((s) => s.posts);
  const platformFilter = useStore((s) => s.platformFilter);
  const searchQuery = useStore((s) => s.searchQuery);
  const openEditor = useStore((s) => s.openEditor);
  const canCreate = useStore((s) => s.permissions.canCreate);

  const q = searchQuery.trim().toLowerCase();
  const posts = allPosts.filter((p) => {
    const platformOk = platformFilter === 'all' || p.platform === platformFilter;
    const searchOk =
      q === '' ||
      p.body.toLowerCase().includes(q) ||
      p.platform.toLowerCase().includes(q) ||
      (p.campaign?.toLowerCase().includes(q) ?? false) ||
      (p.theme?.toLowerCase().includes(q) ?? false);
    return platformOk && searchOk;
  });

  // Conflicts computed over all posts so a flag shows even when filtered.
  const conflictIds = conflictingIds(allPosts);

  return (
    <section aria-label="Pipeline board" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters />
        <div className="flex items-center gap-2">
          <SearchBar />
          {canCreate && (
            <button className="btn-primary py-1.5" onClick={() => openEditor()}>
              <PlusIcon width={16} height={16} /> New brief
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((column) => (
          <BoardColumn
            key={column.status}
            column={column}
            posts={posts.filter((p) => column.statuses.includes(p.status))}
            conflictIds={conflictIds}
          />
        ))}
      </div>

      <BulkActionBar />
    </section>
  );
}
