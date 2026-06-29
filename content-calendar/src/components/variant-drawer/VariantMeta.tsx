import type { ReactNode } from 'react';
import type { ContentItem, ContentVariant } from '../../content/contentTypes';
import { Badge } from '../ui';

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-300">{children}</dd>
    </>
  );
}

interface VariantMetaProps {
  item: ContentItem;
  variant: ContentVariant;
  exportable: boolean;
  blockerCount: number;
}

/** The item's strategy fields at the top of the drawer. */
export function VariantMeta({ item, variant, exportable, blockerCount }: VariantMetaProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200">{item.title}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <MetaRow label="Source">{item.sourceIds.join(', ') || '—'}</MetaRow>
        <MetaRow label="Audience">{item.audience}</MetaRow>
        <MetaRow label="Evidence level">
          <Badge tone="review">{item.evidenceLevel}</Badge>
        </MetaRow>
        <MetaRow label="Claim risk">{item.claimRisk}</MetaRow>
        <MetaRow label="Owner">{item.ownerId ?? '—'}</MetaRow>
        <MetaRow label="Campaign">{item.campaignId ?? '—'}</MetaRow>
        <MetaRow label="Status">{variant.status}</MetaRow>
        <MetaRow label="Publishing">{exportable ? 'cleared' : `blocked (${blockerCount})`}</MetaRow>
      </dl>
    </div>
  );
}
