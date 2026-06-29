import type { ContentVariant } from '../../content/contentTypes';
import { exportBlockers } from '../../content/contentTypes';
import { CheckIcon, AlertIcon } from '../icons';

/** One variant row in an item card; shows channel/format, status, and gate state. */
export function VariantRow({ variant, onOpen }: { variant: ContentVariant; onOpen: () => void }) {
  const cleared = exportBlockers(variant).length === 0;
  return (
    <li>
      <button
        data-testid="variant-row"
        onClick={onOpen}
        className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-left hover:border-vahtian-accent"
      >
        <span className="font-mono text-xs text-slate-300">
          {variant.channel} · {variant.format}
        </span>
        <span data-testid="variant-status" className="text-[11px] uppercase tracking-wide text-slate-500">
          {variant.status}
        </span>
        {cleared ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-status-published">
            <CheckIcon width={12} height={12} /> cleared
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-status-overdue">
            <AlertIcon width={12} height={12} /> blocked
          </span>
        )}
      </button>
    </li>
  );
}
