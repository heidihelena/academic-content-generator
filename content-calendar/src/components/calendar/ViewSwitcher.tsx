import type { CalendarView } from '../../types';
import { useStore } from '../../store/useStore';

const VIEWS: CalendarView[] = ['month', 'week', 'day'];

/** Segmented Month / Week / Day switcher. */
export function ViewSwitcher() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  return (
    <div className="inline-flex rounded-lg border border-surface-700 bg-surface-900 p-0.5" role="group" aria-label="Calendar view">
      {VIEWS.map((v) => {
        const active = view === v;
        return (
          <button
            key={v}
            aria-pressed={active}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
              active ? 'bg-surface-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
