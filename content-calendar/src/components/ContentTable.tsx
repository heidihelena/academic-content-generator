import { useState } from 'react';
import {
  exportBlockers,
  type ContentItemWithVariants,
  type ContentVariant,
} from '../content/contentTypes';
import { CheckIcon, AlertIcon } from './icons';

interface Row {
  variant: ContentVariant;
  item: ContentItemWithVariants;
  cleared: boolean;
}

type SortKey = 'title' | 'channel' | 'status' | 'scheduledAt';

/**
 * Sortable table over the ContentItem/Variant model — one row per variant, with
 * the strategy/ownership columns (campaign, owner) the cards don't show. Click a
 * header to sort, click a row to open the editor drawer. Read-oriented, like the
 * board; status changes still flow through the drawer.
 */
export function ContentTable({
  items,
  onOpen,
  campaigns,
}: {
  items: ContentItemWithVariants[];
  onOpen: (variantId: string) => void;
  /** campaignId → display name; falls back to the id when absent. */
  campaigns?: Map<string, string>;
}) {
  const [sort, setSort] = useState<SortKey>('title');
  const [dir, setDir] = useState<1 | -1>(1);

  const rows: Row[] = items.flatMap((item) =>
    item.variants.map((variant) => ({ variant, item, cleared: exportBlockers(variant).length === 0 })),
  );

  const value = (r: Row, key: SortKey): string =>
    key === 'title' ? r.item.title : key === 'channel' ? r.variant.channel : (r.variant[key] ?? '');
  rows.sort((a, b) => value(a, sort).localeCompare(value(b, sort)) * dir);

  const toggle = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSort(key);
      setDir(1);
    }
  };

  const arrow = (key: SortKey) => (sort === key ? (dir === 1 ? ' ↑' : ' ↓') : '');

  return (
    <div className="overflow-x-auto" data-testid="content-table">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-surface-700 text-slate-400">
            <Th onClick={() => toggle('title')}>Title{arrow('title')}</Th>
            <Th onClick={() => toggle('channel')}>Channel{arrow('channel')}</Th>
            <Th onClick={() => toggle('status')}>Status{arrow('status')}</Th>
            <Th>Audience</Th>
            <Th>Campaign</Th>
            <Th>Owner</Th>
            <Th onClick={() => toggle('scheduledAt')}>Scheduled{arrow('scheduledAt')}</Th>
            <Th>Cleared</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ variant, item, cleared }) => (
            <tr
              key={variant.id}
              data-testid="table-row"
              onClick={() => onOpen(variant.id)}
              className="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
            >
              <td className="py-1.5 pr-3 text-slate-200">{item.title}</td>
              <td className="py-1.5 pr-3 font-mono text-slate-400">{variant.channel} · {variant.format}</td>
              <td className="py-1.5 pr-3 uppercase tracking-wide text-slate-500">{variant.status}</td>
              <td className="py-1.5 pr-3 text-slate-400">{item.audience}</td>
              <td className="py-1.5 pr-3 text-slate-400">
                {item.campaignId ? campaigns?.get(item.campaignId) ?? item.campaignId : '—'}
              </td>
              <td className="py-1.5 pr-3 text-slate-400">{item.ownerId ?? '—'}</td>
              <td className="py-1.5 pr-3 text-slate-400">
                {variant.scheduledAt ? new Date(variant.scheduledAt).toLocaleDateString() : '—'}
              </td>
              <td className="py-1.5">
                {cleared ? (
                  <CheckIcon width={12} height={12} className="text-status-published" />
                ) : (
                  <AlertIcon width={12} height={12} className="text-status-overdue" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={`py-2 pr-3 font-medium ${onClick ? 'cursor-pointer select-none hover:text-slate-200' : ''}`}
    >
      {children}
    </th>
  );
}
