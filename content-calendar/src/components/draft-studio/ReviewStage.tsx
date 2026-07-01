import type { SafetyFinding } from '../../studio/studioTypes';
import type { StudioState } from '../../studio/studioWorkflow';

const SEVERITY_CLASS: Record<SafetyFinding['severity'], string> = {
  block: 'bg-status-failed/15 text-status-failed',
  warn: 'bg-amber-500/15 text-amber-400',
  info: 'bg-surface-700 text-slate-300',
};

type Review = NonNullable<StudioState['review']>;

/** Stage 3: the safety/claims review verdict, with findings and uncited claims. */
export function ReviewStage({ review }: { review: Review }) {
  const uncited = review.claims.filter((c) => c.needsCitation);
  return (
    <div className="space-y-4">
      <div
        data-testid="review-status"
        data-cleared={review.cleared || undefined}
        className={`rounded-lg px-3 py-2 text-sm font-medium ${
          review.cleared ? 'bg-status-published/15 text-status-published' : 'bg-status-failed/15 text-status-failed'
        }`}
      >
        {review.cleared
          ? 'Cleared — no blocking issues. You can approve it for publishing.'
          : 'Blocked — resolve the issues below, then send back to revise.'}
      </div>

      <div className="space-y-2">
        <p className="label">Safety findings ({review.findings.length})</p>
        {review.findings.length === 0 ? (
          <p className="text-xs text-slate-500">No safety findings.</p>
        ) : (
          <ul className="space-y-1.5" data-testid="findings">
            {review.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 font-semibold uppercase ${SEVERITY_CLASS[f.severity]}`}>
                  {f.severity}
                </span>
                <span className="text-slate-300">
                  <span className="text-slate-500">{f.category}:</span> {f.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="label">Claims needing a citation</p>
        {uncited.length === 0 ? (
          <p className="text-xs text-slate-500">No uncited claims detected.</p>
        ) : (
          <ul className="space-y-1.5" data-testid="claims">
            {uncited.map((c, i) => (
              <li key={i} className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
                {c.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
