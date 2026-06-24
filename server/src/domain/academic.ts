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

/** A generated piece of content derived from a source, for one channel + audience. */
export interface ContentOutput {
  id: string;
  sourceId: string;
  channel: ContentChannel;
  audience: Audience;
  body: string;
  status: ContentStatus;
  /** The campaign (series) this output belongs to, when generated as a set. */
  campaignId?: string;
  /** Present once the draft has been through review. */
  reviewState?: ReviewState;
  createdAt: string;
  updatedAt: string;
}

/**
 * Whether a set of safety findings clears export. Content is cleared when it
 * carries no `block`-severity finding; `info`/`warn` are advisory. Shared by the
 * safety reviewer and the patient-safe export gate so the rule lives in one place.
 */
export function isCleared(findings: readonly SafetyFinding[]): boolean {
  return !findings.some((f) => f.severity === 'block');
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
  outputs: readonly Pick<ContentOutput, 'status'>[],
): CampaignStatusRollup {
  const byStatus = Object.fromEntries(
    CONTENT_STATUSES.map((status) => [status, 0]),
  ) as Record<ContentStatus, number>;
  for (const output of outputs) byStatus[output.status]++;
  return { total: outputs.length, byStatus };
}
