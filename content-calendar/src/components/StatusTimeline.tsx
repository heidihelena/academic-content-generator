import { useEffect, useState } from 'react';
import { contentClient } from '../content/contentClient';
import type { ContentVariant, StatusChangeEntry } from '../content/contentTypes';

/**
 * The variant's lifecycle history (approval-workflow audit trail) — each status
 * transition with its time and, when known, who made it. Reloads when the
 * variant's status changes so a fresh schedule/export shows immediately.
 */
export function StatusTimeline({ variant }: { variant: ContentVariant }) {
  const [history, setHistory] = useState<StatusChangeEntry[]>([]);

  useEffect(() => {
    let active = true;
    contentClient
      .listStatusHistory(variant.id)
      .then((h) => active && setHistory(h))
      .catch(() => active && setHistory([]));
    return () => {
      active = false;
    };
  }, [variant.id, variant.status]);

  if (history.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-surface-700 pt-4" data-testid="status-timeline">
      <p className="text-xs font-semibold text-slate-300">History</p>
      <ol className="space-y-1">
        {history.map((c) => (
          <li key={c.id} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-slate-500">{new Date(c.at).toLocaleDateString()}</span>
            <span className="font-medium text-slate-300">
              {c.from ? `${c.from} → ${c.to}` : `created · ${c.to}`}
            </span>
            {c.actor && <span className="text-slate-500">by {c.actor}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
