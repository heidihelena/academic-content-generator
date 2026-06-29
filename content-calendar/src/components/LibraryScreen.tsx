import type { View } from './Sidebar';
import { PipelineBoard } from './board/PipelineBoard';
import { ContentCalendarPage } from './ContentCalendarPage';
import { ListView } from './ListView';
import { ContentItems } from './ContentItems';
import { InsightsPanel } from './InsightsPanel';

/**
 * Library — one screen for everything you've created, with the former separate
 * nav items (Pipeline / Calendar / List / Content) as view toggles. Each toggle
 * is its own deep-linkable route (`#/board`, `#/calendar`, …) so links and the
 * back button still land on a specific lens.
 */
export const LIBRARY_VIEWS: Array<{ id: View; label: string }> = [
  { id: 'board', label: 'Pipeline' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'list', label: 'List' },
  { id: 'content', label: 'Content' },
];

const LIBRARY_IDS = LIBRARY_VIEWS.map((v) => v.id);

/** True when a view belongs to the Library (drives the sidebar's active state). */
export function isLibraryView(view: View): boolean {
  return (LIBRARY_IDS as string[]).includes(view);
}

export function LibraryScreen({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const active: View = isLibraryView(view) ? view : 'board';

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Library views"
        className="flex flex-wrap gap-1 rounded-lg border border-surface-800 bg-surface-900 p-1"
      >
        {LIBRARY_VIEWS.map((v) => {
          const selected = v.id === active;
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(v.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selected ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {active === 'board' && <PipelineBoard />}
      {active === 'calendar' && <ContentCalendarPage />}
      {active === 'list' && <ListView />}
      {active === 'content' && (
        <div className="mx-auto max-w-3xl space-y-5">
          <InsightsPanel />
          <ContentItems />
        </div>
      )}
    </div>
  );
}
