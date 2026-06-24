import { Injectable } from '@nestjs/common';
import { ContentChannel, ContentOutput } from '../domain/academic';
import { OutputsService } from '../outputs/outputs.service';

/** The leading meaningful line of an output body, stripped of markdown markers. */
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
 * composer optional "already covered" context. The vault's backlink graph is
 * the human-facing version of the same idea; this is the structured one.
 */
@Injectable()
export class ReuseService {
  constructor(private readonly outputs: OutputsService) {}

  prior(sourceId: string): Promise<ContentOutput[]> {
    return this.outputs.list({ sourceId });
  }

  /** Short descriptors of prior outputs, for the composer to avoid repeating. */
  async priorContext(sourceId: string): Promise<string[]> {
    return (await this.prior(sourceId)).map((o) => `${o.channel}/${o.audience}: ${hookOf(o.body)}`);
  }

  async summary(sourceId: string): Promise<ReuseSummary> {
    const items = await this.prior(sourceId);
    const byChannel: Partial<Record<ContentChannel, number>> = {};
    for (const o of items) byChannel[o.channel] = (byChannel[o.channel] ?? 0) + 1;
    return {
      sourceId,
      total: items.length,
      byChannel,
      items: items.map((o) => ({
        id: o.id,
        channel: o.channel,
        audience: o.audience,
        campaignId: o.campaignId,
        hook: hookOf(o.body),
      })),
    };
  }
}
