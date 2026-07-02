import { useState } from 'react';
import type { AcademicIdea } from '../../idea-lab/ideaLabClient';
import type { CarouselResult } from '../../carousel/carouselClient';
import { extractKeyPoints } from '../../sources/keyPoints';
import { SOURCE_STATUSES, type SourceMeta, type SourceStatus } from '../../sources/sourceMeta';
import { isVaultSource, sourceMaterial, type Source } from '../../sources/sourcesTypes';
import type { StudioSeed } from '../../studio/studioTypes';
import { Badge, Button } from '../ui';
import { LinkIcon, SparkleIcon } from '../icons';
import { RepurposePanel } from '../RepurposePanel';
import { IdeaList } from './IdeaList';
import { CarouselDeck } from './CarouselDeck';

const STATUS_TONE: Record<SourceStatus, 'info' | 'review' | 'success' | 'neutral'> = {
  new: 'info',
  reviewed: 'review',
  used: 'success',
  archived: 'neutral',
};

interface SourceCardProps {
  source: Source;
  meta: SourceMeta;
  onStatusChange: (status: SourceStatus) => void;
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
export function SourceCard({ source, meta, onStatusChange, onDraft, repurpose, ideas, deck }: SourceCardProps) {
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const material = sourceMaterial(source);
  const keyPoints = showKeyPoints ? extractKeyPoints(material) : [];

  return (
    <li className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge size="chip">{source.kind}</Badge>
            <Badge size="chip" tone={STATUS_TONE[meta.status]} data-testid="source-status">
              {meta.status}
            </Badge>
            {isVaultSource(source) && (
              <Badge tone="brand" size="chip">
                vault
              </Badge>
            )}
            {meta.project && <Badge size="chip">{meta.project}</Badge>}
            {meta.language && <Badge size="chip">{meta.language}</Badge>}
            <span className="truncate text-sm font-medium text-slate-200">{source.title}</span>
          </div>
          {(source.abstract || source.body) && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{source.abstract || source.body}</p>
          )}
          {source.tags.length > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">{source.tags.map((t) => `#${t}`).join(' ')}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <label className="text-[11px] text-slate-500" htmlFor={`status-${source.id}`}>
              Status
            </label>
            <select
              id={`status-${source.id}`}
              className="rounded border border-surface-700 bg-surface-800 px-1.5 py-0.5 text-[11px] text-slate-300"
              value={meta.status}
              onChange={(e) => onStatusChange(e.target.value as SourceStatus)}
            >
              {SOURCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {material && (
              <button
                type="button"
                className="text-[11px] text-brand-400 underline-offset-2 hover:underline"
                onClick={() => setShowKeyPoints((v) => !v)}
                aria-expanded={showKeyPoints}
              >
                {showKeyPoints ? 'Hide key points' : 'Key points'}
              </button>
            )}
          </div>
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

      {showKeyPoints && (
        <ul className="space-y-1 rounded-lg border border-surface-700 bg-surface-900/60 px-3 py-2" data-testid="key-points">
          {keyPoints.length === 0 ? (
            <li className="text-[11px] text-slate-500">No text to extract from yet — paste the abstract first.</li>
          ) : (
            keyPoints.map((point, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-slate-300">
                <span className="text-brand-400">·</span> {point}
              </li>
            ))
          )}
        </ul>
      )}

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
