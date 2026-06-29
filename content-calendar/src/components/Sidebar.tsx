import { BoardIcon, BookIcon, CalendarIcon, ChartIcon, LinkIcon, ListIcon, PlugIcon, SparkleIcon } from './icons';

export type View =
  | 'board'
  | 'calendar'
  | 'list'
  | 'inbox'
  | 'studio'
  | 'content'
  | 'campaigns'
  | 'analytics'
  | 'connections'
  | 'ideas';

type NavItem = { id: View; label: string; icon: (p: { width?: number; height?: number }) => JSX.Element };

/**
 * Primary navigation, grouped by the stage of the workflow it belongs to:
 * Create your content, Plan/track it, Publish it, Measure it. Connections is the
 * single home for accounts + publishing destinations (formerly two nav items).
 */
const SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Create',
    items: [
      { id: 'inbox', label: 'Source Inbox', icon: LinkIcon },
      { id: 'studio', label: 'Draft Studio', icon: BookIcon },
      { id: 'ideas', label: 'Generate Ideas', icon: SparkleIcon },
    ],
  },
  {
    label: 'Plan',
    items: [
      { id: 'board', label: 'Pipeline', icon: BoardIcon },
      { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
      { id: 'list', label: 'List', icon: ListIcon },
      { id: 'content', label: 'Content', icon: ListIcon },
      { id: 'campaigns', label: 'Campaigns', icon: CalendarIcon },
    ],
  },
  {
    label: 'Publish',
    items: [{ id: 'connections', label: 'Connections', icon: PlugIcon }],
  },
  {
    label: 'Measure',
    items: [{ id: 'analytics', label: 'Analytics', icon: ChartIcon }],
  },
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
          ✦
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-100">forskai</p>
          <p className="text-[11px] text-slate-500">Share your research</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-row gap-1 md:flex-col md:gap-0" aria-label="Primary">
        {SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-row gap-1 md:mb-3 md:flex-col md:gap-0.5">
            <p className="hidden px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 md:block">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = view === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onChange(item.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:flex-none md:justify-start ${
                    active ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
                  }`}
                >
                  <Icon width={18} height={18} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
