import { useStore } from '../store/useStore';
import { postsThisWeek, scheduledVsPublished } from '../analytics/calculations';
import type { View } from './Sidebar';

const TITLES: Record<View, { title: string; subtitle: string }> = {
  board: { title: 'Pipeline', subtitle: 'Move each piece from brief to published — and learn' },
  calendar: { title: 'Content Calendar', subtitle: 'Plan your research communication across every network' },
  ideas: { title: 'Generate Ideas', subtitle: 'AI-assisted ways to share your research with any audience' },
  analytics: { title: 'Analytics', subtitle: 'See how your work is reaching peers and the public' },
  accounts: { title: 'Connected Accounts', subtitle: 'Manage your scholarly and social network connections' },
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
      <div className="hidden items-center gap-4 sm:flex">
        <Stat label="This week" value={thisWeek} />
        <Stat label="Scheduled" value={scheduled} />
      </div>
    </header>
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
