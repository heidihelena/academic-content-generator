/**
 * Academic content domain model (ForskAI Content Hub).
 *
 * These schemas describe the academic workflow — source material in, reviewed
 * audience-specific content out — and are the contract the Source Inbox, Idea
 * Lab, Draft Studio and the safety reviewers build against (issue #27).
 *
 * The literal unions are derived from `const` arrays so the allowed values exist
 * at runtime too: the safety/citation reviewers and the API validation layer can
 * check membership without duplicating the list.
 *
 * Note: the citation-on-a-post shape in `./types` is also called `Source`. The
 * academic *entity* (a paper / note / link / lecture you import) is named
 * `SourceMaterial` here to keep both meanings distinct.
 */

/** Kind of academic input brought into the source vault. */
export const SOURCE_KINDS = ['paper', 'note', 'link', 'lecture'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

/** Output channel a piece of content is shaped for. */
export const CONTENT_CHANNELS = [
  'linkedin',
  'bluesky',
  'threads',
  'instagram',
  'newsletter',
  'teaching',
  'talk',
  'shorts',
] as const;
export type ContentChannel = (typeof CONTENT_CHANNELS)[number];

/** Who the content is written for. Drives voice, reading level and safety strictness. */
export const AUDIENCES = ['peers', 'students', 'patients', 'public'] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Editorial stage of a generated piece of content. */
export const CONTENT_STATUSES = [
  'idea',
  'draft',
  'reviewed',
  'scheduled',
  'exported',
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Severity of a safety finding. `block` must be resolved before export. */
export const SAFETY_SEVERITIES = ['info', 'warn', 'block'] as const;
export type SafetySeverity = (typeof SAFETY_SEVERITIES)[number];

/** Category of a safety finding raised by the medical-overclaiming review. */
export const SAFETY_CATEGORIES = [
  'overclaiming',
  'causal-language',
  'dosage',
  'unproven-treatment',
  'identifiable-patient',
] as const;
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

/** Strategy bucket an idea belongs to (a content pillar / theme). */
export const CONTENT_PILLARS = [
  'research-finding',
  'explainer',
  'methods',
  'commentary',
  'education',
  'behind-the-research',
  'announcement',
] as const;
export type ContentPillar = (typeof CONTENT_PILLARS)[number];

/** Strength of the evidence behind a piece's claims. */
export const EVIDENCE_LEVELS = [
  'systematic-review',
  'rct',
  'observational',
  'mechanistic',
  'expert-opinion',
  'unknown',
] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

/** How sensitive/overclaim-prone the claims are — drives review strictness. */
export const CLAIM_RISKS = ['low', 'moderate', 'high'] as const;
export type ClaimRisk = (typeof CLAIM_RISKS)[number];

/** The shape a variant takes on its channel (distinct from where it is published). */
export const VARIANT_FORMATS = [
  'post',
  'thread',
  'carousel',
  'slide',
  'newsletter-paragraph',
  'short-script',
  'talk-script',
] as const;
export type VariantFormat = (typeof VARIANT_FORMATS)[number];

/** A half-open character range `[start, end)` into a content body. */
export interface TextSpan {
  start: number;
  end: number;
}

/**
 * An academic input: a paper, a note, a link or a lecture. Lives in the source
 * vault and is the starting point of the Idea Lab / Draft Studio workflow.
 */
export interface SourceMaterial {
  id: string;
  kind: SourceKind;
  title: string;
  /** Author names, in citation order. */
  authors?: string[];
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  /** Full text / note body, when available. */
  body?: string;
  tags: string[];
  /** ISO 8601 timestamp of when this was imported. */
  importedAt: string;
}

/** A factual statement extracted from a draft (citation-needed detector, #33). */
export interface Claim {
  text: string;
  /** True when the claim asserts an empirical fact without a supporting source. */
  needsCitation: boolean;
  /** Citation that supports the claim, once supplied. */
  citation?: string;
  /** Detector confidence in [0, 1]. */
  confidence: number;
}

/** A safety issue raised by the medical-overclaiming review (#32). */
export interface SafetyFinding {
  severity: SafetySeverity;
  category: SafetyCategory;
  message: string;
  /** Where in the body the issue is, when it maps to a specific span. */
  span?: TextSpan;
  /** Suggested rewording. */
  suggestion?: string;
}

/** The outcome of running claim + safety review over a draft. */
export interface ReviewState {
  claims: Claim[];
  findings: SafetyFinding[];
  /** ISO 8601 timestamp of the review. */
  reviewedAt: string;
  /** True when no unresolved `block` findings remain — gates export. */
  cleared: boolean;
}

/**
 * Whether a set of safety findings clears export. Content is cleared when it
 * carries no `block`-severity finding; `info`/`warn` are advisory. Shared by the
 * safety reviewer and the patient-safe export gate so the rule lives in one place.
 */
export function isCleared(findings: readonly SafetyFinding[]): boolean {
  return !findings.some((f) => f.severity === 'block');
}

/**
 * The core unit of academic content: one *idea*, derived from sources, that
 * fans out into many channel/format/audience {@link ContentVariant}s. The item
 * carries the strategy (pillar, evidence level, claim risk, audience); the
 * variants carry the actual copy and their own per-channel lifecycle + reviews.
 */
export interface ContentItem {
  id: string;
  title: string;
  /** The source material this idea draws on. */
  sourceIds: string[];
  campaignId?: string;
  ownerId?: string;
  audience: Audience;
  pillar: ContentPillar;
  evidenceLevel: EvidenceLevel;
  claimRisk: ClaimRisk;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

/** One channel/format rendering of a {@link ContentItem}, with its own lifecycle. */
export interface ContentVariant {
  id: string;
  contentItemId: string;
  channel: ContentChannel;
  format: VariantFormat;
  body: string;
  hook?: string;
  hashtags: string[];
  status: ContentStatus;
  /** Claim + medical-safety review outcome. */
  safetyReview?: ReviewState;
  /** Citation-support review outcome. */
  citationReview?: ReviewState;
  scheduledAt?: string;
  exportedAt?: string;
  /** When a human signed off on the variant (the explicit review gate). */
  humanReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A record that a {@link ContentVariant} was actually published — the manual-
 * publish assistant's audit trail. After exporting a reviewed variant and posting
 * it by hand (copy → paste into LinkedIn/Bluesky/…), you log *where it went live*
 * (the public URL) and any notes. Many per variant (e.g. cross-posted, edited and
 * re-posted), so it's its own collection keyed by `variantId`.
 */
export interface PublishLog {
  id: string;
  variantId: string;
  channel: ContentChannel;
  /** Public URL of the live post (optional — not every channel yields one). */
  publishedUrl?: string;
  publishedAt: string;
  notes?: string;
  createdAt: string;
}

/**
 * Why a variant cannot be exported yet — the explicit gate the UI surfaces so a
 * user can see *why* a text isn't shippable. Empty array ⇒ cleared for export.
 * A variant is exportable when its medical-safety review is cleared (no blocking
 * findings, patient-safe escalation applied) and a human has signed off.
 */
export function exportBlockers(
  variant: Pick<ContentVariant, 'safetyReview' | 'humanReviewedAt'>,
): string[] {
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

/** A themed series of content planned across channels and time (issue #36). */
export interface Campaign {
  id: string;
  title: string;
  goal?: string;
  audience?: Audience;
  /** Inclusive ISO date (YYYY-MM-DD) range for the campaign. */
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** A count of content items by editorial status — a campaign's progress at a glance. */
export interface CampaignStatusRollup {
  total: number;
  byStatus: Record<ContentStatus, number>;
}

/** Summarises content items by status, with every status present (zero-filled). */
export function rollupByStatus(
  items: readonly { status: ContentStatus }[],
): CampaignStatusRollup {
  const byStatus = Object.fromEntries(
    CONTENT_STATUSES.map((status) => [status, 0]),
  ) as Record<ContentStatus, number>;
  for (const item of items) byStatus[item.status]++;
  return { total: items.length, byStatus };
}
