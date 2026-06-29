import { VariantDrawer } from './VariantDrawer';
import { ScheduledAgenda } from './ScheduledAgenda';
import { ContentBoard } from './ContentBoard';
import { ContentTable } from './ContentTable';
import { ErrorState, LoadingState } from './ui';
import { ContentItemsHeader, ItemCard, useContentItems } from './content-items';

/**
 * Content view: one idea (ContentItem) with its many channel/format variants.
 * Clicking a variant opens the editor drawer on the right. A presentational
 * shell; loading, the open variant, and edits live in `useContentItems`.
 */
export function ContentItems() {
  const c = useContentItems();

  if (c.loading) return <LoadingState label="Loading content…" />;
  if (c.error) return <ErrorState message={c.error} onRetry={c.load} />;

  return (
    <div className="space-y-5">
      <ContentItemsHeader mode={c.mode} onMode={c.setMode} onExportCsv={c.exportCsv} onExportIcs={c.exportIcs} />

      <ScheduledAgenda refreshKey={c.refresh} onSelect={c.setOpenId} />

      {c.mode === 'board' && <ContentBoard items={c.items} onOpen={c.setOpenId} />}

      {c.mode === 'table' && <ContentTable items={c.items} onOpen={c.setOpenId} campaigns={c.campaigns} />}

      {c.mode === 'list' &&
        c.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            campaigns={c.campaigns}
            onOpenVariant={c.setOpenId}
            onVariantAdded={c.addVariant}
          />
        ))}

      {c.open && (
        <VariantDrawer
          item={c.open.item}
          variant={c.open.variant}
          open={true}
          onClose={() => c.setOpenId(null)}
          onChange={c.replaceVariant}
        />
      )}
    </div>
  );
}
