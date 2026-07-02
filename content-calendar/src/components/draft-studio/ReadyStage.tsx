import {
  DRAFT_REVIEW_STATUSES,
  DRAFT_REVIEW_STATUS_LABELS,
  type DraftReviewStatus,
} from '../../studio/studioTypes';
import { Button } from '../ui';

interface ReadyStageProps {
  draft: string;
  saved: boolean;
  reviewStatus: DraftReviewStatus;
  onReviewStatus: (status: DraftReviewStatus) => void;
  onSave: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onReset: () => void;
}

/** The ladder shown at the Ready stage — everything except `archived`. */
const LADDER: DraftReviewStatus[] = DRAFT_REVIEW_STATUSES.filter((s) => s !== 'archived');

/**
 * Stage 4: the approved draft, with the review-status ladder (raw AI → human
 * edited → claim reviewed → citation checked → ready) and save-to-calendar /
 * copy / download / restart.
 */
export function ReadyStage({
  draft,
  saved,
  reviewStatus,
  onReviewStatus,
  onSave,
  onCopy,
  onDownload,
  onReset,
}: ReadyStageProps) {
  const position = LADDER.indexOf(reviewStatus);

  return (
    <div className="space-y-3">
      <p data-testid="ready-banner" className="text-sm font-medium text-status-published">
        Approved — ready to publish. Save it to your calendar to schedule or publish.
      </p>

      <div className="space-y-1.5">
        <p className="label">Review status</p>
        <ol className="flex flex-wrap gap-1.5" aria-label="Review status ladder" data-testid="review-ladder">
          {LADDER.map((status, i) => {
            const reached = i <= position;
            const next = i === position + 1;
            return (
              <li key={status}>
                <button
                  type="button"
                  onClick={() => onReviewStatus(status)}
                  disabled={!reached && !next}
                  aria-current={status === reviewStatus ? 'step' : undefined}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    status === reviewStatus
                      ? 'bg-brand-500/20 text-brand-strong'
                      : reached
                        ? 'bg-surface-700 text-slate-300'
                        : next
                          ? 'border border-dashed border-surface-600 text-slate-400 hover:border-brand-500/50'
                          : 'border border-surface-700 text-slate-600'
                  }`}
                >
                  {reached && status !== reviewStatus ? '✓ ' : ''}
                  {DRAFT_REVIEW_STATUS_LABELS[status]}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-[11px] text-slate-500">
          Tick each step as you do it — the ladder records that a human stands behind the claims and citations.
        </p>
      </div>

      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
        {draft}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onSave} disabled={saved}>
          {saved ? '✓ Saved to calendar' : 'Save to calendar'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCopy}>
          Copy
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownload}>
          Download .md
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Start over
        </Button>
      </div>
      {saved && (
        <p data-testid="studio-saved" className="text-xs text-status-published">
          Saved as a draft on your content calendar.
        </p>
      )}
    </div>
  );
}
