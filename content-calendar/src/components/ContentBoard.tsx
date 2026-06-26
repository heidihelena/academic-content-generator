import {
  exportBlockers,
  type ContentItemWithVariants,
  type ContentStatus,
  type ContentVariant,
} from '../content/contentTypes';
import { CheckIcon, AlertIcon } from './icons';

/** The editorial lifecycle, in order — one Kanban column each. */
const COLUMNS: { status: ContentStatus; label: string }[] = [
  { status: 'idea', label: 'Idea' },
  { status: 'draft', label: 'Draft' },
  { status: 'reviewed', label: 'Reviewed' },
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'exported', label: 'Exported' },
];

interface Card {
  variant: ContentVariant;
  title: string;
}

/**
 * Kanban over the ContentItem/Variant model: every variant placed in the column
 * for its lifecycle status. Click a card to open it in the editor drawer (the
 * same drawer the list view uses). A read-oriented board — status changes still
 * happen through the drawer's review → schedule → export actions.
 */
export function ContentBoard({
  items,
  onOpen,
}: {
  items: ContentItemWithVariants[];
  onOpen: (variantId: string) => void;
}) {
  const byStatus = new Map<ContentStatus, Card[]>(COLUMNS.map((c) => [c.status, []]));
  for (const item of items) {
    for (const variant of item.variants) {
      byStatus.get(variant.status)?.push({ variant, title: item.title });
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" data-testid="content-board">
      {COLUMNS.map((col) => {
        const cards = byStatus.get(col.status) ?? [];
        return (
          <section
            key={col.status}
            aria-label={col.label}
            className="w-56 flex-shrink-0 rounded-lg border border-surface-800 bg-surface-900/40 p-2"
          >
            <header className="flex items-center justify-between px-1 pb-2">
              <h3 className="text-xs font-semibold text-slate-300">{col.label}</h3>
              <span className="text-[11px] text-slate-500">{cards.length}</span>
            </header>
            <ul className="space-y-2">
              {cards.map(({ variant, title }) => {
                const cleared = exportBlockers(variant).length === 0;
                return (
                  <li key={variant.id}>
                    <button
                      data-testid="board-card"
                      onClick={() => onOpen(variant.id)}
                      className="w-full rounded-md border border-surface-700 bg-surface-800/60 p-2 text-left hover:border-violet-500"
                    >
                      <p className="truncate text-xs font-medium text-slate-200">{title}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-400">
                          {variant.channel} · {variant.format}
                        </span>
                        {cleared ? (
                          <CheckIcon width={11} height={11} className="ml-auto text-status-published" />
                        ) : (
                          <AlertIcon width={11} height={11} className="ml-auto text-status-overdue" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
              {cards.length === 0 && <li className="px-1 text-[11px] text-slate-600">—</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
