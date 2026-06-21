import { useStore } from '../store/useStore';
import { Filters } from './Filters';

/**
 * Sidebar housing the platform + status filters (filterState), a live result
 * count, and a clear-filters action. Reuses the `Filters` controls so the
 * filtering behavior is shared with the rest of the app.
 */
export function FilterSidebar() {
  const platformFilter = useStore((s) => s.platformFilter);
  const statusFilter = useStore((s) => s.statusFilter);
  const searchQuery = useStore((s) => s.searchQuery);
  const setPlatformFilter = useStore((s) => s.setPlatformFilter);
  const setStatusFilter = useStore((s) => s.setStatusFilter);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const filteredCount = useStore((s) => s.filteredPosts().length);
  const totalCount = useStore((s) => s.posts.length);

  const filtersActive = platformFilter !== 'all' || statusFilter !== 'all' || searchQuery !== '';

  return (
    <aside aria-label="Filters" className="card h-fit w-full shrink-0 p-4 lg:w-60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Filters</h2>
        {filtersActive && (
          <button
            className="text-[11px] text-brand-400 hover:underline"
            onClick={() => {
              setPlatformFilter('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
          >
            Clear
          </button>
        )}
      </div>
      <Filters />
      <p className="mt-3 text-[11px] text-slate-500">
        Showing {filteredCount} of {totalCount} posts
      </p>
    </aside>
  );
}
