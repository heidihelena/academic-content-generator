import { useState } from 'react';
import { useStore } from '../store/useStore';
import { postsThisWeek, scheduledVsPublished } from '../analytics/calculations';
import type { View } from './Sidebar';
import { getTheme, toggleTheme, type Theme } from '../lib/theme';
import { MoonIcon, SunIcon } from './icons';
import { ConnectionStatus } from './ConnectionStatus';

const TITLES: Record<View, { title: string; subtitle: string }> = {
  home: { title: 'Home', subtitle: 'Your getting-started steps and a snapshot of what’s in flight' },
  board: { title: 'Pipeline', subtitle: 'Move each piece from brief to published — and learn' },
  calendar: { title: 'Content Calendar', subtitle: 'Plan your research communication across every network' },
  list: { title: 'All content', subtitle: 'Every post in one sortable, filterable table' },
  inbox: { title: 'Source Inbox', subtitle: 'Your papers, notes, links and Obsidian vault in one place' },
  studio: { title: 'Draft Studio', subtitle: 'Compose, review and export reviewed, audience-specific content' },
  content: { title: 'Content', subtitle: 'One idea, many variants — schedule and publish each' },
  campaigns: { title: 'Campaigns', subtitle: 'Group your content into themed series and track each one' },
  ideas: { title: 'Generate Ideas', subtitle: 'AI-assisted ways to share your research with any audience' },
  analytics: { title: 'Analytics', subtitle: 'See how your work is reaching peers and the public' },
  connections: { title: 'Connections', subtitle: 'Connect accounts and wire up your generators and publishing destinations' },
  outbox: { title: 'Outbox', subtitle: 'What’s published, scheduled and what failed — across every destination' },
  settings: { title: 'Settings', subtitle: 'Local inputs & storage — your Obsidian vault path and content database' },
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
