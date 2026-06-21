import type { PostStatus } from '../types';
import { useStore } from '../store/useStore';
import { TrashIcon, CloseIcon } from './icons';

const STATUSES: PostStatus[] = ['draft', 'scheduled', 'published', 'failed'];

/**
 * Floating action bar shown when one or more posts are selected
 * (bulkSelectionState). Offers bulk status change and delete, gated by
 * permissionsState.
 */
export function BulkActionBar() {
  const selectedIds = useStore((s) => s.selectedIds);
  const clearSelection = useStore((s) => s.clearSelection);
  const bulkDelete = useStore((s) => s.bulkDelete);
  const bulkSetStatus = useStore((s) => s.bulkSetStatus);
  const permissions = useStore((s) => s.permissions);

  if (selectedIds.length === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-surface-600 bg-surface-850 px-4 py-2.5 shadow-2xl"
    >
      <span className="text-sm font-medium text-slate-200" data-testid="bulk-count">
        {selectedIds.length} selected
      </span>

      {permissions.canBulk && (
        <select
          aria-label="Set status for selected"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              bulkSetStatus(e.target.value as PostStatus);
              e.target.value = '';
            }
          }}
          className="input w-auto py-1.5 text-xs"
        >
          <option value="" disabled>
            Mark as…
          </option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      )}

      {permissions.canDelete && (
        <button className="btn-danger py-1.5 text-xs" onClick={bulkDelete}>
          <TrashIcon width={14} height={14} /> Delete
        </button>
      )}

      <button className="btn-ghost py-1.5 text-xs" onClick={clearSelection} aria-label="Clear selection">
        <CloseIcon width={14} height={14} /> Clear
      </button>
    </div>
  );
}
