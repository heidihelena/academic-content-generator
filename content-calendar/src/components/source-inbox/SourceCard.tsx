import type { AcademicIdea } from '../../idea-lab/ideaLabClient';
import type { CarouselResult } from '../../carousel/carouselClient';
import { isVaultSource, sourceMaterial, type Source } from '../../sources/sourcesTypes';
import type { StudioSeed } from '../../studio/studioTypes';
import { Badge, Button } from '../ui';
import { LinkIcon, SparkleIcon } from '../icons';
import { RepurposePanel } from '../RepurposePanel';
import { IdeaList } from './IdeaList';
import { CarouselDeck } from './CarouselDeck';

interface SourceCardProps {
  source: Source;
  onDraft: (seed: StudioSeed) => void;
  repurpose: { open: boolean; onToggle: () => void };
  ideas: { open: boolean; busy: boolean; error: string | null; items: AcademicIdea[]; onToggle: () => void; onRetry: () => void };
  deck: {
    open: boolean;
    busy: boolean;
    error: string | null;
    result: CarouselResult | null;
    onToggle: () => void;
    onRetry: () => void;
    onDownload: () => void;
  };
}

/** One source row: metadata, the four actions, and any inline expansion panel
 *  (repurpose / ideas / deck). State is owned by the parent hooks. */
export function SourceCard({ source, onDraft, repurpose, ideas, deck }: SourceCardProps) {
  return (
    <li className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge size="chip">{source.kind}</Badge>
            {isVaultSource(source) && (
              <Badge tone="brand" size="chip">
                vault
              </Badge>
            )}
            <span className="truncate text-sm font-medium text-slate-200">{source.title}</span>
          </div>
          {(source.abstract || source.body) && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{source.abstract || source.body}</p>
          )}
          {source.tags.length > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">{source.tags.map((t) => `#${t}`).join(' ')}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button size="sm" onClick={repurpose.onToggle} aria-expanded={repurpose.open}>
            <SparkleIcon width={13} height={13} /> Turn into posts
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDraft({ title: source.title, material: sourceMaterial(source), sourceId: source.id })}
          >
            Draft in Studio →
          </Button>
          <Button variant="secondary" size="sm" onClick={ideas.onToggle} aria-expanded={ideas.open}>
            <SparkleIcon width={13} height={13} /> Suggest angles
          </Button>
          <Button variant="secondary" size="sm" onClick={deck.onToggle} aria-expanded={deck.open}>
            <LinkIcon width={13} height={13} /> Build slide deck
          </Button>
        </div>
      </div>

      {repurpose.open && <RepurposePanel source={source} onDraft={onDraft} />}

      {ideas.open && (
        <IdeaList
          source={source}
          busy={ideas.busy}
          error={ideas.error}
          ideas={ideas.items}
          onRetry={ideas.onRetry}
          onDraft={onDraft}
        />
      )}

      {deck.open && (
        <CarouselDeck
          busy={deck.busy}
          error={deck.error}
          deck={deck.result}
          onRetry={deck.onRetry}
          onDownload={deck.onDownload}
        />
      )}
    </li>
  );
}
