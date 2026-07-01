import { BrandMark } from './BrandMark';
import {
  BoardIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  HomeIcon,
  LinkIcon,
  OutboxIcon,
  PlugIcon,
  SparkleIcon,
} from './icons';

export type View =
  | 'home'
  | 'board'
  | 'calendar'
  | 'list'
  | 'inbox'
  | 'studio'
  | 'content'
  | 'campaigns'
  | 'analytics'
  | 'connections'
  | 'outbox'
  | 'settings'
  | 'ideas';

type NavItem = { id: View; label: string; icon: (p: { width?: number; height?: number }) => JSX.Element };

// The Library nav item (id 'board') stays highlighted for any of its sub-views.
const LIBRARY_VIEWS: View[] = ['board', 'calendar', 'list', 'content'];
function isActive(item: View, view: View): boolean {
  return item === 'board' ? LIBRARY_VIEWS.includes(view) : item === view;
}

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
      // Pipeline / Calendar / List / Content are view toggles inside Library.
      { id: 'board', label: 'Library', icon: BoardIcon },
      { id: 'campaigns', label: 'Campaigns', icon: CalendarIcon },
    ],
  },
  {
    label: 'Publish',
    items: [
      { id: 'outbox', label: 'Outbox', icon: OutboxIcon },
      { id: 'connections', label: 'Connections', icon: PlugIcon },
    ],
  },
  {
    label: 'Measure',
    items: [{ id: 'analytics', label: 'Analytics', icon: ChartIcon }],
  },
  {
    label: 'Setup',
    items: [{ id: 'settings', label: 'Settings', icon: BookIcon }],
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
      <div className="mb-0 hidden items-center gap-2.5 px-2 py-2 md:mb-4 md:flex">
        <BrandMark size={30} />
        <div className="leading-tight">
          <p className="text-sm tracking-tight">
            <span className="font-semibold text-slate-100">forskai</span>
            <span className="font-normal text-slate-600">&nbsp;·&nbsp;</span>
            <span className="font-normal text-slate-400">Studio</span>
          </p>
          <p className="text-[11px] text-slate-500">Test before you trust</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-row gap-1 md:flex-col md:gap-0" aria-label="Primary">
        <button
          aria-label="Home"
          aria-current={view === 'home' ? 'page' : undefined}
          onClick={() => onChange('home')}
          className={`mb-0 flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:mb-3 md:flex-none md:justify-start ${
            view === 'home' ? 'bg-brand-500/15 text-brand-strong' : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
          }`}
        >
          <HomeIcon width={18} height={18} />
          <span className="hidden md:inline">Home</span>
        </button>
        {SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-row gap-1 md:mb-3 md:flex-col md:gap-0.5">
            <p className="hidden px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 md:block">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.id, view);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onChange(item.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:flex-none md:justify-start ${
                    active ? 'bg-brand-500/15 text-brand-strong' : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
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
