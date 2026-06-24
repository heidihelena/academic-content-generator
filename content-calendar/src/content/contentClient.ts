import { ApiClient } from '../lib/api';
import type { ContentClient, ContentItemWithVariants, ContentVariant } from './contentTypes';

/**
 * Content client — lists ContentItems with their variants and drives the
 * variant lifecycle (schedule → publish). Local mock by default (sample data,
 * works offline and in tests); the backend when `VITE_API_URL` is set.
 */

const cleared = (findings: string[] = []) => ({ cleared: findings.length === 0, findings });

export const SAMPLE_ITEMS: ContentItemWithVariants[] = [
  {
    id: 'ci_trees',
    title: 'Street trees cool low-income neighbourhoods least',
    sourceIds: ['src_sample_trees'],
    audience: 'public',
    pillar: 'research-finding',
    evidenceLevel: 'observational',
    claimRisk: 'low',
    status: 'reviewed',
    variants: [
      {
        id: 'cv_trees_li',
        contentItemId: 'ci_trees',
        channel: 'linkedin',
        format: 'post',
        body: 'Across 84 cities, tree canopy was associated with cooler streets…',
        hook: 'Your street’s temperature is an equity issue.',
        hashtags: ['UrbanHeat', 'Equity'],
        status: 'reviewed',
        safetyReview: cleared(),
      },
      {
        id: 'cv_trees_bs',
        contentItemId: 'ci_trees',
        channel: 'bluesky',
        format: 'thread',
        body: '1/ Tree cover and heat aren’t evenly shared…',
        hashtags: [],
        status: 'reviewed',
        safetyReview: cleared(),
      },
      {
        id: 'cv_trees_patient',
        contentItemId: 'ci_trees',
        channel: 'newsletter',
        format: 'newsletter-paragraph',
        body: 'Trees guarantee a cooler home and cure heat illness.',
        hashtags: [],
        status: 'draft',
        safetyReview: cleared(['overclaim “guarantee” — Vahtian records, it doesn’t prove']),
      },
    ],
  },
  {
    id: 'ci_sleep',
    title: 'Slow-wave sleep and memory consolidation',
    sourceIds: ['src_sample_sleep'],
    audience: 'students',
    pillar: 'explainer',
    evidenceLevel: 'mechanistic',
    claimRisk: 'low',
    status: 'reviewed',
    variants: [
      {
        id: 'cv_sleep_slide',
        contentItemId: 'ci_sleep',
        channel: 'teaching',
        format: 'slide',
        body: 'Slide: how sleep consolidates memory.',
        hashtags: [],
        status: 'reviewed',
        safetyReview: cleared(),
      },
    ],
  },
];

export class LocalContentClient implements ContentClient {
  readonly name = 'local';
  private items: ContentItemWithVariants[];

  constructor(seed: ContentItemWithVariants[] = SAMPLE_ITEMS) {
    this.items = seed.map((i) => ({ ...i, variants: i.variants.map((v) => ({ ...v })) }));
  }

  async listItems(): Promise<ContentItemWithVariants[]> {
    return this.items.map((i) => ({ ...i, variants: i.variants.map((v) => ({ ...v })) }));
  }

  private find(variantId: string): ContentVariant {
    for (const item of this.items) {
      const v = item.variants.find((x) => x.id === variantId);
      if (v) return v;
    }
    throw new Error('Variant not found.');
  }

  async schedule(variantId: string, scheduledAt: string): Promise<ContentVariant> {
    const v = this.find(variantId);
    v.status = 'scheduled';
    v.scheduledAt = scheduledAt;
    return { ...v };
  }

  async publish(variantId: string): Promise<ContentVariant> {
    const v = this.find(variantId);
    if (!v.safetyReview?.cleared) {
      throw new Error('Cannot export: the safety review has unresolved blocking findings.');
    }
    v.status = 'exported';
    v.exportedAt = new Date().toISOString();
    return { ...v };
  }
}

export class ApiContentClient implements ContentClient {
  readonly name = 'api';
  constructor(private readonly api: ApiClient) {}

  async listItems(): Promise<ContentItemWithVariants[]> {
    const items = await this.api.get<ContentItemWithVariants[]>('/content-items');
    return Promise.all(
      items.map(async (item) => ({
        ...item,
        variants: await this.api.get<ContentVariant[]>(`/content-items/${item.id}/variants`),
      })),
    );
  }

  schedule(variantId: string, scheduledAt: string): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-variants/${variantId}/schedule`, { scheduledAt });
  }

  publish(variantId: string): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-variants/${variantId}/publish`);
  }
}

function createDefault(): ContentClient {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiContentClient(new ApiClient(baseUrl)) : new LocalContentClient();
}

let active: ContentClient = createDefault();

/** Override the active client (used by tests). */
export function setContentClient(client: ContentClient): void {
  active = client;
}

export function listContentItems(): Promise<ContentItemWithVariants[]> {
  return active.listItems();
}
export function scheduleVariant(variantId: string, scheduledAt: string): Promise<ContentVariant> {
  return active.schedule(variantId, scheduledAt);
}
export function publishVariant(variantId: string): Promise<ContentVariant> {
  return active.publish(variantId);
}
