import type { ContentVariant } from '../../content/contentTypes';

/** Safety + citation review findings for a variant. */
export function Findings({ variant }: { variant: ContentVariant }) {
  const safety = variant.safetyReview;
  const citation = variant.citationReview;
  if (!safety && !citation) {
    return <p className="text-[11px] text-slate-500">No reviews run yet.</p>;
  }
  const blocks = safety?.findings.filter((f) => f.severity === 'block') ?? [];
  const warns = safety?.findings.filter((f) => f.severity === 'warn') ?? [];
  const needsCite = citation?.claims.filter((c) => c.needsCitation) ?? [];

  return (
    <div className="space-y-2" data-testid="findings">
      {safety && blocks.length === 0 && warns.length === 0 && (
        <p className="text-[11px] text-status-published">✓ Safety review clean.</p>
      )}
      {blocks.map((f, i) => (
        <p key={`b${i}`} className="text-xs text-status-overdue">
          ⛔ {f.message}
        </p>
      ))}
      {warns.map((f, i) => (
        <p key={`w${i}`} className="text-xs text-amber-400/90">
          ⚠ {f.message}
        </p>
      ))}
      {citation && needsCite.length === 0 && <p className="text-[11px] text-status-published">✓ Citations present.</p>}
      {needsCite.map((c, i) => (
        <p key={`c${i}`} className="text-xs text-amber-400/90">
          “{c.text}” — needs a citation
        </p>
      ))}
    </div>
  );
}
