import { useEffect, useState } from 'react';
import type { ContentItemWithVariants, ContentVariant } from '../content/contentTypes';
import { listContentItems, publishVariant, scheduleVariant } from '../content/contentClient';
import { SparkleIcon, CheckIcon, AlertIcon } from './icons';
import { Spinner } from './ui/Spinner';
import { ErrorState, LoadingState } from './ui/States';

/** Tomorrow 09:00 local — a sensible default schedule slot. */
function tomorrowMorning(): string {
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}

/**
 * Content view: one idea (ContentItem) with its many channel/format variants.
 * Each variant shows its safety status and can be scheduled, then published —
 * publishing is blocked unless the safety review is cleared (the same gate as
 * the backend).
 */
export function ContentItems() {
  const [items, setItems] = useState<ContentItemWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listContentItems()
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

  if (loading) return <LoadingState label="Loading content…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <SparkleIcon width={20} height={20} className="text-brand-400" />
        <div>
          <h1 className="text-base font-semibold text-slate-200">Content</h1>
          <p className="text-xs text-slate-500">
            One idea, many variants. Schedule and publish each — publishing needs a cleared safety review.
          </p>
        </div>
      </header>

      {items.map((item) => (
        <ItemCard key={item.id} item={item} onVariant={replaceVariant} />
      ))}
    </div>
  );
}

function ItemCard({
  item,
  onVariant,
}: {
  item: ContentItemWithVariants;
  onVariant: (v: ContentVariant) => void;
}) {
  return (
    <section aria-label={item.title} className="card space-y-3 p-4">
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
        {item.variants.map((v) => (
          <VariantRow key={v.id} variant={v} onVariant={onVariant} />
        ))}
      </ul>
    </section>
  );
}

function VariantRow({
  variant,
  onVariant,
}: {
  variant: ContentVariant;
  onVariant: (v: ContentVariant) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleared = variant.safetyReview?.cleared ?? false;

  const run = async (fn: () => Promise<ContentVariant>) => {
    setBusy(true);
    setError(null);
    try {
      onVariant(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      data-testid="variant-row"
      className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-300">
          {variant.channel} · {variant.format}
        </span>
        <span data-testid="variant-status" className="text-[11px] uppercase tracking-wide text-slate-500">
          {variant.status}
        </span>
        {cleared ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-published">
            <CheckIcon width={12} height={12} /> cleared
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-overdue">
            <AlertIcon width={12} height={12} /> not cleared
          </span>
        )}

        <div className="ml-auto flex gap-1.5">
          <button
            className="btn-secondary py-1 text-xs"
            disabled={busy || variant.status === 'exported'}
            onClick={() => run(() => scheduleVariant(variant.id, tomorrowMorning()))}
          >
            Schedule
          </button>
          <button
            className="btn-primary py-1 text-xs"
            disabled={busy || !cleared || variant.status === 'exported'}
            title={cleared ? undefined : 'Blocked: safety review not cleared'}
            onClick={() => run(() => publishVariant(variant.id))}
          >
            {busy ? <Spinner size={12} label="Working" /> : null} Publish
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-status-overdue">{error}</p>}
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
      {children}
    </span>
  );
}
