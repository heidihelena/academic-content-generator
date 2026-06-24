import { ApiClient } from '../lib/api';
import type {
  ContentClient,
  ContentItemWithVariants,
  ContentVariant,
  NewVariantInput,
  SafetyFinding,
} from './contentTypes';

/**
 * Content client — lists ContentItems with their variants and drives the
 * variant workflow (edit → run reviews → mark reviewed → schedule → publish).
 * Local mock by default (sample data, works offline and in tests); the backend
 * when `VITE_API_URL` is set.
 */

const ok = (): { cleared: true; findings: [] } => ({ cleared: true, findings: [] });

// Illustrative subset of the canonical server rules; the authoritative reviews
// run server-side in API mode.
const OVERCLAIMS: Array<[RegExp, string]> = [
  [/\bcures?\b/i, 'overclaim “cure” — Vahtian records, it doesn’t prove'],
  [/\bguarantees?\b/i, 'overclaim “guarantee” — soften to “may”'],
  [/\b100% ?(?:effective|accurate)\b/i, 'absolute claim “100%”'],
  [/\bproves?\b/i, 'overclaim “proves” — report associations, not proof'],
];
const CAUSAL = /\b(causes?|caused|leads? to)\b/i;
const QUANTITATIVE = /\b\d+(?:\.\d+)?\s?%|\bby \d+/i;
const CITATION_PRESENT = /\(\w+,?\s*\d{4}\)|\[\d+\]|doi:|https?:\/\//i;

function localSafetyReview(body: string, patientFacing: boolean): ContentVariant['safetyReview'] {
  const findings: SafetyFinding[] = [];
  for (const [re, message] of OVERCLAIMS) if (re.test(body)) findings.push({ severity: 'block', message });
  if (CAUSAL.test(body)) {
    findings.push({
      severity: patientFacing ? 'block' : 'warn',
      message: 'causal language — confirm the evidence supports causation',
    });
  }
  return { cleared: findings.every((f) => f.severity !== 'block'), findings };
}

function localCitationReview(body: string): ContentVariant['citationReview'] {
  const claims = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => QUANTITATIVE.test(s) || CAUSAL.test(s))
    .map((text) => ({ text, needsCitation: !CITATION_PRESENT.test(text) }));
  return { cleared: claims.every((c) => !c.needsCitation), claims };
}

export const SAMPLE_ITEMS: ContentItemWithVariants[] = [
  {
    id: 'ci_trees',
    title: 'Street trees cool low-income neighbourhoods least',
    sourceIds: ['src_sample_trees'],
    campaignId: 'cmp_heat',
    ownerId: 'you',
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
        body: 'Across 84 cities, tree canopy was associated with cooler streets (Smith, 2024).',
        hook: 'Your street’s temperature is an equity issue.',
        hashtags: ['UrbanHeat', 'Equity'],
        status: 'reviewed',
        safetyReview: ok(),
      },
      {
        id: 'cv_trees_bs',
        contentItemId: 'ci_trees',
        channel: 'bluesky',
        format: 'thread',
        body: '1/ Tree cover and heat aren’t evenly shared across a city.',
        hashtags: [],
        status: 'draft',
      },
      {
        id: 'cv_trees_patient',
        contentItemId: 'ci_trees',
        channel: 'newsletter',
        format: 'newsletter-paragraph',
        body: 'Planting trees cures heat illness and guarantees a cooler home.',
        hashtags: [],
        status: 'draft',
      },
    ],
  },
  {
    id: 'ci_sleep',
    title: 'Slow-wave sleep and memory consolidation',
    sourceIds: ['src_sample_sleep'],
    ownerId: 'you',
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
        body: 'Slide: how slow-wave sleep consolidates the day’s memories.',
        hashtags: [],
        status: 'reviewed',
        safetyReview: ok(),
        humanReviewedAt: '2026-06-20T00:00:00.000Z',
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

  private locate(variantId: string): { item: ContentItemWithVariants; variant: ContentVariant } {
    for (const item of this.items) {
      const variant = item.variants.find((v) => v.id === variantId);
      if (variant) return { item, variant };
    }
    throw new Error('Variant not found.');
  }

  async addVariant(itemId: string, input: NewVariantInput): Promise<ContentVariant> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) throw new Error('Item not found.');
    const variant: ContentVariant = {
      id: `cv_local_${Math.random().toString(36).slice(2, 8)}`,
      contentItemId: itemId,
      channel: input.channel,
      format: input.format,
      body: input.body,
      hook: input.hook,
      hashtags: input.hashtags ?? [],
      status: 'draft',
    };
    item.variants.push(variant);
    return { ...variant };
  }

  async updateVariant(
    id: string,
    patch: Partial<Pick<ContentVariant, 'body' | 'hook' | 'hashtags'>>,
  ): Promise<ContentVariant> {
    const { variant } = this.locate(id);
    Object.assign(variant, patch);
    return { ...variant };
  }

  async runSafetyReview(id: string): Promise<ContentVariant> {
    const { item, variant } = this.locate(id);
    variant.safetyReview = localSafetyReview(
      variant.body,
      item.audience === 'patients' || item.audience === 'public',
    );
    return { ...variant };
  }

  async runCitationReview(id: string): Promise<ContentVariant> {
    const { variant } = this.locate(id);
    variant.citationReview = localCitationReview(variant.body);
    return { ...variant };
  }

  async markReviewed(id: string): Promise<ContentVariant> {
    const { variant } = this.locate(id);
    variant.humanReviewedAt = new Date().toISOString();
    return { ...variant };
  }

  async schedule(id: string, scheduledAt: string): Promise<ContentVariant> {
    const { variant } = this.locate(id);
    variant.status = 'scheduled';
    variant.scheduledAt = scheduledAt;
    return { ...variant };
  }

  async publish(id: string): Promise<ContentVariant> {
    const { variant } = this.locate(id);
    if (!variant.safetyReview?.cleared) throw new Error('Cannot export: blocking safety findings.');
    if (!variant.humanReviewedAt) throw new Error('Cannot export: not marked human-reviewed.');
    variant.status = 'exported';
    variant.exportedAt = new Date().toISOString();
    return { ...variant };
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

  addVariant(itemId: string, input: NewVariantInput): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-items/${itemId}/variants`, input);
  }
  updateVariant(
    id: string,
    patch: Partial<Pick<ContentVariant, 'body' | 'hook' | 'hashtags'>>,
  ): Promise<ContentVariant> {
    return this.api.patch<ContentVariant>(`/content-variants/${id}`, patch);
  }
  runSafetyReview(id: string): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-variants/${id}/review/safety`);
  }
  runCitationReview(id: string): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-variants/${id}/review/citation`);
  }
  markReviewed(id: string): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-variants/${id}/mark-reviewed`);
  }
  schedule(id: string, scheduledAt: string): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-variants/${id}/schedule`, { scheduledAt });
  }
  publish(id: string): Promise<ContentVariant> {
    return this.api.post<ContentVariant>(`/content-variants/${id}/publish`);
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

export const contentClient = {
  listItems: () => active.listItems(),
  addVariant: (itemId: string, input: NewVariantInput) => active.addVariant(itemId, input),
  updateVariant: (id: string, patch: Partial<Pick<ContentVariant, 'body' | 'hook' | 'hashtags'>>) =>
    active.updateVariant(id, patch),
  runSafetyReview: (id: string) => active.runSafetyReview(id),
  runCitationReview: (id: string) => active.runCitationReview(id),
  markReviewed: (id: string) => active.markReviewed(id),
  schedule: (id: string, scheduledAt: string) => active.schedule(id, scheduledAt),
  publish: (id: string) => active.publish(id),
};
