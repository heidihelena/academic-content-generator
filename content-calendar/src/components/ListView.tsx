import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatDateTime } from '../lib/dateUtils';
import { EVIDENCE_META, sourceLabel } from '../lib/evidence';
import { PlatformBadge, StatusBadge } from './PlatformBadge';
import { Filters } from './Filters';
import { SearchBar } from './calendar/SearchBar';
import { EmptyState } from './ui/States';
import { BookIcon, ListIcon } from './icons';

type SortDir = 'asc' | 'desc';

/**
 * Sortable, filterable table of every post — the fast triage surface that
 * complements the board (workflow) and calendar (timing). Reuses the shared
 * platform/status filters and search so it stays in sync with the other views.
 * Clicking a row opens the editor drawer.
 */
export function ListView() {
  const filteredPosts = useStore((s) => s.filteredPosts);
  const openEditor = useStore((s) => s.openEditor);
  // Subscribe to the inputs of filteredPosts so the table re-renders on changes.
  const allPosts = useStore((s) => s.posts);
  const platformFilter = useStore((s) => s.platformFilter);
  const statusFilter = useStore((s) => s.statusFilter);
  const searchQuery = useStore((s) => s.searchQuery);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    const sorted = [...filteredPosts()].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    return sortDir === 'asc' ? sorted : sorted.reverse();
    // allPosts/filters are inputs to filteredPosts(); listed so the table reacts.
  }, [filteredPosts, allPosts, platformFilter, statusFilter, searchQuery, sortDir]);

  return (
    <section aria-label="All content" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters />
        <SearchBar />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ListIcon width={28} height={28} />}
          title="No posts match these filters"
          description="Adjust the platform, stage or search filters to see content here."
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-surface-700 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">
                  <button
                    className="inline-flex items-center gap-1 hover:text-slate-300"
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    aria-label="Sort by date"
                  >
                    When {sortDir === 'asc' ? '↑' : '↓'}
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Post</th>
                <th className="px-3 py-2 font-medium">Evidence</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((post) => (
                <tr
                  key={post.id}
                  data-testid={`list-row-${post.id}`}
                  onClick={() => openEditor(post.id)}
                  className="cursor-pointer border-b border-surface-800 last:border-0 hover:bg-surface-800/50"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                    {formatDateTime(post.scheduledAt)}
                  </td>
                  <td className="px-3 py-2">
                    <PlatformBadge platform={post.platform} showLabel size={13} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="max-w-[22rem] px-3 py-2 text-slate-300">
                    <span className="line-clamp-1">
                      {post.body || <span className="italic text-slate-500">Empty draft…</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {post.evidenceLevel ? (
                      <span style={{ color: EVIDENCE_META[post.evidenceLevel].color }}>
                        {EVIDENCE_META[post.evidenceLevel].label}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="max-w-[12rem] px-3 py-2 text-slate-400">
                    {post.source ? (
                      <span className="inline-flex items-center gap-1">
                        <BookIcon width={11} height={11} />
                        <span className="truncate">{sourceLabel(post.source)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                    {post.owner ?? <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
