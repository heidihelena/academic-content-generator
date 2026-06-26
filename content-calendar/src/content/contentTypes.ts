/** Frontend mirror of the backend ContentItem + ContentVariant model. */

export type Audience = 'peers' | 'students' | 'patients' | 'public';
export type ContentStatus = 'idea' | 'draft' | 'reviewed' | 'scheduled' | 'exported';
export type Severity = 'info' | 'warn' | 'block';

export interface SafetyFinding {
  severity: Severity;
  message: string;
  category?: string;
}

export interface SafetyReview {
  cleared: boolean;
  findings: SafetyFinding[];
}

export interface Claim {
  text: string;
  needsCitation: boolean;
}

export interface CitationReview {
  cleared: boolean;
  claims: Claim[];
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
  safetyReview?: SafetyReview;
  citationReview?: CitationReview;
  scheduledAt?: string;
  exportedAt?: string;
  humanReviewedAt?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  sourceIds: string[];
  campaignId?: string;
  ownerId?: string;
  audience: Audience;
  pillar: string;
  evidenceLevel: string;
  claimRisk: string;
  status: ContentStatus;
}

export interface ContentItemWithVariants extends ContentItem {
  variants: ContentVariant[];
}

/** A record that a variant was published by hand (mirrors the backend PublishLog). */
export interface PublishLogEntry {
  id: string;
  variantId: string;
  channel: string;
  publishedUrl?: string;
  publishedAt: string;
  notes?: string;
  createdAt: string;
}

export interface RecordPublishInput {
  publishedUrl?: string;
  notes?: string;
}

/** One step in a variant's lifecycle (mirrors the backend StatusChange). */
export interface StatusChangeEntry {
  id: string;
  variantId: string;
  from?: ContentStatus;
  to: ContentStatus;
  actor?: string;
  at: string;
}

/** A note/comment on a content item (mirrors the backend Comment). */
export interface CommentEntry {
  id: string;
  itemId: string;
  author?: string;
  body: string;
  createdAt: string;
}

/** A campaign (mirrors the backend Campaign). */
export interface Campaign {
  id: string;
  title: string;
  goal?: string;
  audience?: Audience;
  /** Inclusive ISO date (YYYY-MM-DD) range. */
  startDate?: string;
  endDate?: string;
}

/** A pre-publish checklist entry on a content item (mirrors the backend). */
export interface ChecklistEntry {
  id: string;
  itemId: string;
  label: string;
  done: boolean;
  createdAt: string;
}

/** A media attachment on a content item (mirrors the backend Asset). */
export interface AssetEntry {
  id: string;
  itemId: string;
  url: string;
  type: 'image' | 'video';
  label?: string;
  createdAt: string;
}

/**
 * Why a variant can't be exported yet — mirrors the backend `exportBlockers`.
 * Empty array ⇒ cleared for export.
 */
export function exportBlockers(variant: ContentVariant): string[] {
  const blockers: string[] = [];
  if (!variant.safetyReview) {
    blockers.push('Medical-safety review has not been run.');
  } else if (!variant.safetyReview.cleared) {
    const blocks = variant.safetyReview.findings.filter((f) => f.severity === 'block').length;
    blockers.push(`${blocks} blocking safety finding${blocks === 1 ? '' : 's'} unresolved.`);
  }
  if (!variant.humanReviewedAt) blockers.push('Not yet marked human-reviewed.');
  return blockers;
}

/** Publishing channels and the shapes a variant can take (mirror the backend). */
export const VARIANT_CHANNELS = [
  'linkedin',
  'bluesky',
  'threads',
  'instagram',
  'newsletter',
  'teaching',
  'talk',
  'shorts',
] as const;
export const VARIANT_FORMATS = [
  'post',
  'thread',
  'carousel',
  'slide',
  'newsletter-paragraph',
  'short-script',
  'talk-script',
] as const;

export interface NewVariantInput {
  channel: string;
  format: string;
  body: string;
  hook?: string;
  hashtags?: string[];
}

/** A scheduled variant flattened for the calendar/agenda (mirrors the backend). */
export interface CalendarEntry {
  variantId: string;
  itemId: string;
  title: string;
  channel: string;
  format: string;
  audience: string;
  scheduledAt: string;
  status: ContentStatus;
  exported: boolean;
}

/** A suggested posting slot from the timing optimizer (mirrors the backend). */
export interface TimingSuggestion {
  weekday: number; // 0=Sun … 6=Sat (UTC)
  hour: number;
  label: string;
  score: number;
  rationale: string;
  learnedFrom: number;
}

export interface EngagementSyncResult {
  synced: number;
}

export interface ContentClient {
  readonly name: string;
  listItems(): Promise<ContentItemWithVariants[]>;
  calendarFeed(): Promise<CalendarEntry[]>;
  timingSuggestions(channel: string, audience: string): Promise<TimingSuggestion[]>;
  syncEngagement(): Promise<EngagementSyncResult>;
  addVariant(itemId: string, input: NewVariantInput): Promise<ContentVariant>;
  updateVariant(
    id: string,
    patch: Partial<Pick<ContentVariant, 'body' | 'hook' | 'hashtags'>>,
  ): Promise<ContentVariant>;
  runSafetyReview(id: string): Promise<ContentVariant>;
  runCitationReview(id: string): Promise<ContentVariant>;
  markReviewed(id: string): Promise<ContentVariant>;
  schedule(id: string, scheduledAt: string): Promise<ContentVariant>;
  publish(id: string): Promise<ContentVariant>;
  /** Manual-publish assistant: list / record where a variant went live. */
  listPublishLog(variantId: string): Promise<PublishLogEntry[]>;
  recordPublish(variantId: string, input: RecordPublishInput): Promise<PublishLogEntry>;
  /** The variant's lifecycle transitions (approval-workflow audit trail). */
  listStatusHistory(variantId: string): Promise<StatusChangeEntry[]>;
  /** Notes/comments on a content item. */
  listComments(itemId: string): Promise<CommentEntry[]>;
  addComment(itemId: string, body: string): Promise<CommentEntry>;
  /** Campaigns — used to resolve a content item's campaignId to a name. */
  listCampaigns(): Promise<Campaign[]>;
  /** Pre-publish checklist on a content item. */
  listChecklist(itemId: string): Promise<ChecklistEntry[]>;
  addChecklistItem(itemId: string, label: string): Promise<ChecklistEntry>;
  setChecklistDone(itemId: string, checkId: string, done: boolean): Promise<ChecklistEntry>;
  removeChecklistItem(itemId: string, checkId: string): Promise<void>;
  /** Media attachments on a content item. */
  listAssets(itemId: string): Promise<AssetEntry[]>;
  attachAsset(itemId: string, input: { url: string; type: 'image' | 'video'; label?: string }): Promise<AssetEntry>;
  removeAsset(itemId: string, assetId: string): Promise<void>;
}
