import { CalendarIcon, ChartIcon, PlugIcon, SparkleIcon } from './icons';

export type View = 'calendar' | 'analytics' | 'accounts' | 'ideas';

const NAV: Array<{ id: View; label: string; icon: (p: { width?: number; height?: number }) => JSX.Element }> = [
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'ideas', label: 'Generate Ideas', icon: SparkleIcon },
  { id: 'analytics', label: 'Analytics', icon: ChartIcon },
  { id: 'accounts', label: 'Accounts', icon: PlugIcon },
];

interface SidebarProps {
  view: View;
  onChange: (view: View) => void;
}

/** Primary navigation. Collapses to an icon row on small screens. */
export function Sidebar({ view, onChange }: SidebarProps) {
  return (
    <aside className="flex shrink-0 flex-row gap-1 border-b border-surface-800 bg-surface-900 p-2 md:w-56 md:flex-col md:border-b-0 md:border-r md:p-3">
      <div className="mb-0 hidden items-center gap-2 px-2 py-2 md:mb-4 md:flex">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          v
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-100">vahtian</p>
          <p className="text-[11px] text-slate-500">Content Studio</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-row gap-1 md:flex-col" aria-label="Primary">
        {NAV.map((item) => {
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(item.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:flex-none md:justify-start ${
                active ? 'bg-surface-700 text-white' : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
              }`}
            >
              <Icon width={18} height={18} />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
