import type { AcademicIdea } from '../../idea-lab/ideaLabClient';
import { sourceMaterial, type Source } from '../../sources/sourcesTypes';
import type { StudioSeed } from '../../studio/studioTypes';
import { Badge, Button, ErrorState, Spinner } from '../ui';

interface IdeaListProps {
  source: Source;
  busy: boolean;
  error: string | null;
  ideas: AcademicIdea[];
  onRetry: () => void;
  onDraft: (seed: StudioSeed) => void;
}

/** Inline panel of source-grounded angles, each draftable into the Studio. */
export function IdeaList({ source, busy, error, ideas, onRetry, onDraft }: IdeaListProps) {
  return (
    <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
      {busy ? (
        <Spinner />
      ) : error ? (
        <ErrorState title="Couldn't generate ideas" message={error} onRetry={onRetry} />
      ) : (
        <ul className="space-y-2" data-testid="idea-list">
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="flex items-start justify-between gap-3 rounded-md border border-surface-700 bg-surface-800/60 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge size="chip">{idea.channel}</Badge>
                  <span className="truncate text-sm font-medium text-slate-200">{idea.angle}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{idea.hook}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  onDraft({ title: idea.angle, material: `${idea.hook}\n\n${sourceMaterial(source)}`, sourceId: source.id })
                }
              >
                Draft this →
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
