import { useState } from 'react';
import { useStore } from '../store/useStore';
import { postsThisWeek, scheduledVsPublished } from '../analytics/calculations';
import type { View } from './Sidebar';
import { getTheme, toggleTheme, type Theme } from '../lib/theme';
import { MoonIcon, SunIcon } from './icons';
import { ConnectionStatus } from './ConnectionStatus';

const TITLES: Record<View, { title: string; subtitle: string }> = {
  home: { title: 'Home', subtitle: 'Set up the app and see what needs your attention' },
  board: { title: 'Pipeline', subtitle: 'Track each piece from draft to published' },
  calendar: { title: 'Calendar', subtitle: 'See what’s scheduled, and when' },
  list: { title: 'All content', subtitle: 'Every post in one sortable, filterable table' },
  inbox: { title: 'Source Inbox', subtitle: 'Pick a paper or note to turn into posts' },
  studio: { title: 'Draft Studio', subtitle: 'Write a post, check it for overclaims and missing citations, then approve it' },
  content: { title: 'Content', subtitle: 'One idea, several versions — review and publish each' },
  campaigns: { title: 'Campaigns', subtitle: 'Group related content into a series and track it' },
  ideas: { title: 'Generate Ideas', subtitle: 'Get suggested angles for sharing a finding with an audience' },
  analytics: { title: 'Analytics', subtitle: 'See how your work is reaching peers and the public' },
  connections: { title: 'Connections', subtitle: 'Connect the accounts you’ll post to' },
  outbox: { title: 'Outbox', subtitle: 'Posted, scheduled, and anything that failed' },
  settings: { title: 'Settings', subtitle: 'Your Obsidian vault path and where content is stored on this Mac' },
};

interface HeaderProps {
  view: View;
}

/** Top bar with contextual title, quick KPIs and the primary "New post" action. */
export function Header({ view }: HeaderProps) {
  const posts = useStore((s) => s.posts);
  const weekAnchor = useStore((s) => s.weekAnchor);

  const thisWeek = postsThisWeek(posts, new Date(weekAnchor));
  const { scheduled } = scheduledVsPublished(posts);
  const meta = TITLES[view];

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900/60 px-4 py-3 backdrop-blur sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{meta.title}</h1>
        <p className="text-xs text-slate-500">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-4 sm:flex">
          <Stat label="This week" value={thisWeek} />
          <Stat label="Scheduled" value={scheduled} />
        </div>
        <ConnectionStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Switch between the ink (dark) and paper (light) palettes. */
function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>(() => getTheme());
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setLocalTheme(toggleTheme())}
      className="btn-ghost px-2"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <p className="text-base font-semibold text-slate-100">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
