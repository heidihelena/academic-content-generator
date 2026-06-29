import type { ContentItem, ContentVariant, TimingSuggestion } from '../../content/contentTypes';
import { Button } from '../ui';
import { CheckIcon, AlertIcon } from '../icons';

interface PublishingGateProps {
  item: ContentItem;
  variant: ContentVariant;
  exportable: boolean;
  blockers: string[];
  suggestions: TimingSuggestion[];
  busy: string | null;
  onScheduleDefault: () => void;
  onScheduleSuggestion: (s: TimingSuggestion) => void;
  onPublish: () => void;
}

/** The publishing gate: blockers, best-time suggestions, schedule + approve. */
export function PublishingGate({
  item,
  variant,
  exportable,
  blockers,
  suggestions,
  busy,
  onScheduleDefault,
  onScheduleSuggestion,
  onPublish,
}: PublishingGateProps) {
  return (
    <div className="space-y-2 border-t border-surface-700 pt-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-vahtian-accent">Approve for publishing</p>
        {exportable ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-published">
            <CheckIcon width={12} height={12} /> cleared
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-overdue">
            <AlertIcon width={12} height={12} /> blocked
          </span>
        )}
      </div>
      {!exportable && (
        <ul data-testid="export-blockers" className="space-y-1">
          {blockers.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-status-overdue">
              <AlertIcon width={12} height={12} className="mt-0.5 shrink-0" /> {b}
            </li>
          ))}
        </ul>
      )}
      {suggestions.length > 0 && variant.status !== 'exported' && (
        <div data-testid="timing-suggestions" className="space-y-1">
          <p className="text-[11px] text-slate-500">
            Best times ({variant.channel} · {item.audience}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.label}
                data-testid="timing-suggestion"
                title={`${s.rationale}${s.learnedFrom ? ` · learned from ${s.learnedFrom}` : ''}`}
                className="rounded-md border border-surface-700 bg-surface-800/60 px-2 py-1 text-[11px] text-slate-300 hover:border-vahtian-accent"
                disabled={busy === 'schedule'}
                onClick={() => onScheduleSuggestion(s)}
              >
                🕑 {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={variant.status === 'exported'}
          loading={busy === 'schedule'}
          onClick={onScheduleDefault}
        >
          Schedule
        </Button>
        <Button
          size="sm"
          disabled={!exportable || variant.status === 'exported'}
          loading={busy === 'publish'}
          title={exportable ? undefined : 'Resolve the blockers above first'}
          onClick={onPublish}
        >
          {variant.status === 'exported' ? 'Approved' : 'Approve for publishing'}
        </Button>
      </div>
    </div>
  );
}
