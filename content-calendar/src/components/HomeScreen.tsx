import { useStore } from '../store/useStore';
import type { View } from './Sidebar';
import { CheckIcon } from './icons';

/**
 * Home — the landing screen. Replaces "drop the user on a sample-data Pipeline"
 * with a short getting-started checklist (so a new user knows the first moves)
 * plus a few live counts and quick links into the workflow. Everything is
 * derived from the store, so it works offline and updates as you go.
 */
const DRAFT_STATES = ['brief', 'draft', 'review', 'approved'];

export function HomeScreen({ onNavigate }: { onNavigate: (view: View) => void }) {
  const posts = useStore((s) => s.posts);
  const accounts = useStore((s) => s.accounts);

  const connected = accounts.filter((a) => a.status === 'connected').length;
  const drafts = posts.filter((p) => DRAFT_STATES.includes(p.status)).length;
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const published = posts.filter((p) => p.status === 'published').length;

  const steps: Array<{ done: boolean; label: string; cta: string; to: View }> = [
    { done: connected > 0, label: 'Connect a publishing account', cta: 'Connections', to: 'connections' },
    { done: posts.length > 0, label: 'Bring in a source and draft from it', cta: 'Source Inbox', to: 'inbox' },
    { done: published > 0, label: 'Publish your first post', cta: 'Outbox', to: 'outbox' },
  ];

  const stats: Array<{ n: number; label: string; to: View }> = [
    { n: drafts, label: 'Drafts', to: 'content' },
    { n: scheduled, label: 'Scheduled', to: 'calendar' },
    { n: published, label: 'Published', to: 'outbox' },
    { n: connected, label: 'Accounts', to: 'connections' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="home">
      <section aria-label="Getting started" className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-slate-200">Getting started</h2>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    s.done ? 'bg-status-published/20 text-status-published' : 'border border-surface-600 text-transparent'
                  }`}
                >
                  <CheckIcon width={11} height={11} />
                </span>
                <span className={s.done ? 'text-slate-400 line-through' : 'text-slate-200'}>{s.label}</span>
              </span>
              {!s.done && (
                <button className="btn-secondary shrink-0 py-1 text-xs" onClick={() => onNavigate(s.to)}>
                  {s.cta} →
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="At a glance" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => onNavigate(s.to)}
            className="card p-4 text-left transition-colors hover:border-brand-500/40"
          >
            <p className="text-2xl font-semibold text-slate-100">{s.n}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </button>
        ))}
      </section>
    </div>
  );
}
