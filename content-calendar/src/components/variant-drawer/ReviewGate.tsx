import type { ContentVariant } from '../../content/contentTypes';
import { Button } from '../ui';
import { CheckIcon } from '../icons';
import { Findings } from './Findings';

interface ReviewGateProps {
  variant: ContentVariant;
  busy: string | null;
  onSafety: () => void;
  onCitation: () => void;
  onMarkReviewed: () => void;
}

/** The review gate: run safety/citation reviews, see findings, mark reviewed. */
export function ReviewGate({ variant, busy, onSafety, onCitation, onMarkReviewed }: ReviewGateProps) {
  return (
    <div className="space-y-3 border-t border-surface-700 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-vahtian-accent">Review gate</p>
      <p className="text-[11px] text-slate-500">
        Draft → run review → fix findings → mark reviewed → approve for publishing.
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Button variant="secondary" size="sm" loading={busy === 'safety'} onClick={onSafety}>
          Run medical safety review
        </Button>
        <Button variant="secondary" size="sm" loading={busy === 'citation'} onClick={onCitation}>
          Run citation review
        </Button>
      </div>

      <Findings variant={variant} />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!!variant.humanReviewedAt}
          loading={busy === 'review'}
          onClick={onMarkReviewed}
        >
          {variant.humanReviewedAt ? (
            <>
              <CheckIcon width={12} height={12} /> Human-reviewed
            </>
          ) : (
            'Mark human reviewed'
          )}
        </Button>
      </div>
    </div>
  );
}
