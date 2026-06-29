import type { ShortsPlanResult } from '../../ai/shortsTypes';
import { Button } from '../ui';
import { PlusIcon } from '../icons';
import { ClipRecipeBlock } from './ClipRecipeBlock';

interface ShortsPlanProps {
  result: ShortsPlanResult;
  limit: number;
  videoUrl?: string;
  added: boolean;
  onAdd: () => void;
}

/** The planned clips, each with its time range, hook, caption and render recipe. */
export function ShortsPlan({ result, limit, videoUrl, added, onAdd }: ShortsPlanProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {result.shorts.length} clip{result.shorts.length > 1 ? 's' : ''} · via {result.source}
        </p>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <PlusIcon width={14} height={14} /> Add to Drafting
        </Button>
      </div>

      <ol data-testid="shorts-plan" className="space-y-2">
        {result.shorts.map((s, i) => (
          <li key={s.id} className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600/20 text-[11px] text-brand-400">
                  {i + 1}
                </span>
                {s.title}
              </span>
              {s.timeRange ? (
                <span className="shrink-0 rounded bg-surface-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                  {s.timeRange}
                </span>
              ) : (
                <span className="shrink-0 text-[10px] text-slate-500">no timestamps</span>
              )}
            </div>
            <p className="mt-1.5 text-xs italic text-slate-300">“{s.hook}”</p>
            <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-400">{s.caption}</p>
            <span className="mt-1 block text-[10px] text-slate-500">
              {s.caption.length}/{limit}
            </span>
            {s.startSeconds !== undefined && s.endSeconds !== undefined && (
              <ClipRecipeBlock startSeconds={s.startSeconds} endSeconds={s.endSeconds} index={i + 1} videoUrl={videoUrl} />
            )}
          </li>
        ))}
      </ol>

      {added && (
        <p data-testid="shorts-added" className="text-xs text-status-published">
          ✓ Added {result.shorts.length} YouTube short{result.shorts.length > 1 ? 's' : ''} to your Drafting column.
        </p>
      )}
    </div>
  );
}
