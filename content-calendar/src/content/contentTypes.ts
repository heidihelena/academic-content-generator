/** Frontend mirror of the backend ContentItem + ContentVariant model. */

export type Audience = 'peers' | 'students' | 'patients' | 'public';
export type ContentStatus = 'idea' | 'draft' | 'reviewed' | 'scheduled' | 'exported';

export interface VariantReview {
  cleared: boolean;
  findings: string[];
}

export interface ContentVariant {
  id: string;
  contentItemId: string;
  channel: string;
  format: string;
  body: string;
  hook?: string;
  hashtags: string[];
  status: ContentStatus;
  safetyReview?: VariantReview;
  scheduledAt?: string;
  exportedAt?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  sourceIds: string[];
  campaignId?: string;
  audience: Audience;
  pillar: string;
  evidenceLevel: string;
  claimRisk: string;
  status: ContentStatus;
}

export interface ContentItemWithVariants extends ContentItem {
  variants: ContentVariant[];
}

export interface ContentClient {
  readonly name: string;
  listItems(): Promise<ContentItemWithVariants[]>;
  schedule(variantId: string, scheduledAt: string): Promise<ContentVariant>;
  publish(variantId: string): Promise<ContentVariant>;
}
