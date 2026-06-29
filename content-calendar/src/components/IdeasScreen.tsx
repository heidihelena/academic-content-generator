import { useState } from 'react';
import { GenerateIdeas } from './GenerateIdeas';
import { AbstractToThread } from './AbstractToThread';
import { TalkPackageStudio } from './TalkPackageStudio';
import { VideoToShorts } from './VideoToShorts';

/**
 * Idea tools, one hub. These four AI-assisted generators used to stack on a
 * single scroll; they're now tabs so each gets full focus and the screen isn't
 * a wall of forms. Each is independent — pick the output you want to start from.
 */
const TABS: Array<{ id: string; label: string; Component: () => JSX.Element }> = [
  { id: 'ideas', label: 'Ideas', Component: GenerateIdeas },
  { id: 'thread', label: 'Abstract → thread', Component: AbstractToThread },
  { id: 'talk', label: 'Talk package', Component: TalkPackageStudio },
  { id: 'shorts', label: 'Video → shorts', Component: VideoToShorts },
];

export function IdeasScreen() {
  const [active, setActive] = useState('ideas');
  const Active = (TABS.find((t) => t.id === active) ?? TABS[0]).Component;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Idea tools"
        className="flex flex-wrap gap-1 rounded-lg border border-surface-800 bg-surface-900 p-1"
      >
        {TABS.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selected ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <Active />
    </div>
  );
}
