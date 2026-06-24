import { Injectable } from '@nestjs/common';
import { ContentChannel, ContentItem, ContentVariant } from '../domain/academic';
import { ContentService } from '../content/content.service';

/** The leading meaningful line of a variant body, stripped of markdown markers. */
function hookOf(body: string): string {
  for (const raw of (body ?? '').split('\n')) {
    const stripped = raw
      .trim()
      .replace(/^#+\s*/, '') // heading
      .replace(/^\[.*?\]\s*$/, '') // a bracket-only marker line (e.g. [Short 1/2])
      .replace(/^(HOOK|POINT):\s*/i, ''); // short-script label
    if (stripped) return stripped.slice(0, 120);
  }
  return '';
}

export interface ReuseSummary {
  sourceId: string;
  total: number;
  byChannel: Partial<Record<ContentChannel, number>>;
  items: Array<{
    id: string;
    channel: ContentChannel;
    audience: string;
    campaignId?: string;
    hook: string;
  }>;
}

/**
 * Cross-campaign reuse: what has already been generated from a source. Lets the
 * planner see prior work (avoid duplicating or contradicting it) and feeds the
 * composer optional "already covered" context. Reads the ContentItem/Variant
 * store — the structured twin of the vault's backlink graph.
 */
@Injectable()
export class ReuseService {
  constructor(private readonly content: ContentService) {}

  /** Prior (item, variant) pairs derived from a source. */
  private async pairs(sourceId: string): Promise<Array<{ item: ContentItem; variant: ContentVariant }>> {
    const items = await this.content.listItems({ sourceId });
    const out: Array<{ item: ContentItem; variant: ContentVariant }> = [];
    for (const item of items) {
      for (const variant of await this.content.listVariants(item.id)) out.push({ item, variant });
    }
    return out;
  }

  /** Short descriptors of prior variants, for the composer to avoid repeating. */
  async priorContext(sourceId: string): Promise<string[]> {
    return (await this.pairs(sourceId)).map(
      ({ item, variant }) => `${variant.channel}/${item.audience}: ${hookOf(variant.body)}`,
    );
  }

  async summary(sourceId: string): Promise<ReuseSummary> {
    const pairs = await this.pairs(sourceId);
    const byChannel: Partial<Record<ContentChannel, number>> = {};
    for (const { variant } of pairs) byChannel[variant.channel] = (byChannel[variant.channel] ?? 0) + 1;
    return {
      sourceId,
      total: pairs.length,
      byChannel,
      items: pairs.map(({ item, variant }) => ({
        id: variant.id,
        channel: variant.channel,
        audience: item.audience,
        campaignId: item.campaignId,
        hook: hookOf(variant.body),
      })),
    };
  }
}
