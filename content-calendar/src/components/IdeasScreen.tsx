import { useState } from 'react';
import type { StudioSeed } from '../studio/studioTypes';
import { IdeaLabScreen } from './IdeaLabScreen';
import { GenerateIdeas } from './GenerateIdeas';
import { AbstractToThread } from './AbstractToThread';
import { TalkPackageStudio } from './TalkPackageStudio';
import { VideoToShorts } from './VideoToShorts';

/**
 * The Idea Lab hub. The primary tab turns one of your sources into five graded
 * content ideas; the other AI-assisted generators (topic ideas, abstract →
 * thread, talk package, video → shorts) live alongside it as tabs.
 */
const TABS: Array<{ id: string; label: string; Component?: () => JSX.Element }> = [
  { id: 'source', label: 'From a source' },
  { id: 'ideas', label: 'Ideas', Component: GenerateIdeas },
  { id: 'thread', label: 'Abstract → thread', Component: AbstractToThread },
  { id: 'talk', label: 'Talk package', Component: TalkPackageStudio },
  { id: 'shorts', label: 'Video → shorts', Component: VideoToShorts },
];

export function IdeasScreen({ onDraft }: { onDraft: (seed: StudioSeed) => void }) {
  const [active, setActive] = useState('source');
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

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

      {tab.id === 'source' ? <IdeaLabScreen onDraft={onDraft} /> : tab.Component ? <tab.Component /> : null}
    </div>
  );
}
