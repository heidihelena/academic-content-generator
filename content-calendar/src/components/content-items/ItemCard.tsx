import type { ContentItemWithVariants, ContentVariant } from '../../content/contentTypes';
import { Badge, Card, Heading } from '../ui';
import { VariantRow } from './VariantRow';
import { AddVariant } from './AddVariant';

interface ItemCardProps {
  item: ContentItemWithVariants;
  campaigns: Map<string, string>;
  onOpenVariant: (variantId: string) => void;
  onVariantAdded: (v: ContentVariant) => void;
}

/** One idea card: strategy badges, its variant rows, and the add-variant form. */
export function ItemCard({ item, campaigns, onOpenVariant, onVariantAdded }: ItemCardProps) {
  return (
    <Card as="section" aria-label={item.title} className="space-y-3 p-4">
      <div>
        <Heading>{item.title}</Heading>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.campaignId && <Badge>📁 {campaigns.get(item.campaignId) ?? item.campaignId}</Badge>}
          <Badge>{item.pillar}</Badge>
          <Badge>{item.audience}</Badge>
          <Badge>evidence: {item.evidenceLevel}</Badge>
          <Badge>claim risk: {item.claimRisk}</Badge>
        </div>
      </div>
      <ul className="space-y-2">
        {item.variants.map((v) => (
          <VariantRow key={v.id} variant={v} onOpen={() => onOpenVariant(v.id)} />
        ))}
      </ul>
      <AddVariant item={item} onAdded={onVariantAdded} />
    </Card>
  );
}
