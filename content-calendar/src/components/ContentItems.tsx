import { useEffect, useState } from 'react';
import type { ContentItemWithVariants, ContentVariant } from '../content/contentTypes';
import { exportBlockers } from '../content/contentTypes';
import { contentClient } from '../content/contentClient';
import { VariantDrawer } from './VariantDrawer';
import { SparkleIcon, CheckIcon, AlertIcon } from './icons';
import { ErrorState, LoadingState } from './ui/States';

/**
 * Content view: one idea (ContentItem) with its many channel/format variants.
 * Clicking a variant opens the editor drawer on the right — the list stays
 * visible — where it can be edited, reviewed and (once cleared) exported.
 */
export function ContentItems() {
  const [items, setItems] = useState<ContentItemWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    contentClient
      .listItems()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load content.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const replaceVariant = (next: ContentVariant) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === next.contentItemId
          ? { ...item, variants: item.variants.map((v) => (v.id === next.id ? next : v)) }
          : item,
      ),
    );

  const open = items.flatMap((i) => i.variants.map((v) => ({ item: i, variant: v }))).find((p) => p.variant.id === openId);

  if (loading) return <LoadingState label="Loading content…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <SparkleIcon width={20} height={20} className="text-brand-400" />
        <div>
          <h1 className="text-base font-semibold text-slate-200">Content</h1>
          <p className="text-xs text-slate-500">
            One idea, many variants. Click a variant to edit, review and export it in the side panel.
          </p>
        </div>
      </header>

      {items.map((item) => (
        <section key={item.id} aria-label={item.title} className="card space-y-3 p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{item.title}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Chip>{item.pillar}</Chip>
              <Chip>{item.audience}</Chip>
              <Chip>evidence: {item.evidenceLevel}</Chip>
              <Chip>claim risk: {item.claimRisk}</Chip>
            </div>
          </div>
          <ul className="space-y-2">
            {item.variants.map((v) => {
              const cleared = exportBlockers(v).length === 0;
              return (
                <li key={v.id}>
                  <button
                    data-testid="variant-row"
                    onClick={() => setOpenId(v.id)}
                    className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-left hover:border-violet-500"
                  >
                    <span className="font-mono text-xs text-slate-300">{v.channel} · {v.format}</span>
                    <span data-testid="variant-status" className="text-[11px] uppercase tracking-wide text-slate-500">{v.status}</span>
                    {cleared ? (
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-status-published"><CheckIcon width={12} height={12} /> cleared</span>
                    ) : (
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-status-overdue"><AlertIcon width={12} height={12} /> blocked</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {open && (
        <VariantDrawer
          item={open.item}
          variant={open.variant}
          open={true}
          onClose={() => setOpenId(null)}
          onChange={replaceVariant}
        />
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">{children}</span>
  );
}
