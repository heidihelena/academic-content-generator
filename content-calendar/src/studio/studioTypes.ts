/**
 * Draft Studio types — the academic content shapes mirrored on the client so the
 * end-to-end flow (compose → draft → review → export) works in local mode. These
 * match the server's `domain/academic.ts`; the server is authoritative when the
 * API is wired.
 */

export const STUDIO_CHANNELS = [
  'linkedin',
  'threads',
  'instagram',
  'newsletter',
  'teaching',
  'video-script',
  'explainer',
] as const;
export type StudioChannel = (typeof STUDIO_CHANNELS)[number];

export const STUDIO_CHANNEL_LABELS: Record<StudioChannel, string> = {
  linkedin: 'LinkedIn post',
  threads: 'Threads/X thread',
  instagram: 'Instagram caption',
  newsletter: 'Newsletter section',
  teaching: 'Teaching explanation',
  'video-script': 'Short video script',
  explainer: 'Patient-safe explainer',
};

export const STUDIO_AUDIENCES = ['peers', 'students', 'patients', 'public'] as const;
export type StudioAudience = (typeof STUDIO_AUDIENCES)[number];

export type SafetySeverity = 'info' | 'warn' | 'block';

export type SafetyCategory =
  | 'overclaiming'
  | 'causal-language'
  | 'dosage'
  | 'unproven-treatment'
  | 'identifiable-patient';

export interface SafetyFinding {
  severity: SafetySeverity;
  category: SafetyCategory;
  message: string;
}

export interface Claim {
  text: string;
  needsCitation: boolean;
  confidence: number;
}

export interface ReviewState {
  claims: Claim[];
  findings: SafetyFinding[];
  /** True when no unresolved `block` finding remains — gates export. */
  cleared: boolean;
}

/**
 * The review-status ladder a draft climbs before it may be published. Every
 * draft starts as a raw AI (or template) draft and must be human-edited and
 * reviewed before it can be marked ready.
 */
export const DRAFT_REVIEW_STATUSES = [
  'raw-ai',
  'human-edited',
  'claim-reviewed',
  'citation-checked',
  'ready',
  'archived',
] as const;
export type DraftReviewStatus = (typeof DRAFT_REVIEW_STATUSES)[number];

export const DRAFT_REVIEW_STATUS_LABELS: Record<DraftReviewStatus, string> = {
  'raw-ai': 'Raw AI draft',
  'human-edited': 'Human edited',
  'claim-reviewed': 'Claim reviewed',
  'citation-checked': 'Citation checked',
  ready: 'Ready to publish',
  archived: 'Archived',
};

/** A source handed off from the Source Inbox to pre-fill the Compose stage. */
export interface StudioSeed {
  title: string;
  material: string;
  /** Backend source id, when the seed came from a stored source. */
  sourceId?: string;
  /** Pre-selected channel/audience/hook, when the seed came from an Idea Lab idea. */
  channel?: StudioChannel;
  audience?: StudioAudience;
  hook?: string;
}

/** What the author provides in the Compose stage. */
export interface StudioInput {
  title: string;
  /** The source material (abstract / notes) to draft from. */
  material: string;
  channel: StudioChannel;
  audience: StudioAudience;
  /** Optional hook / angle to steer the draft. */
  hook: string;
  /** Backend source id when drafting from a stored source (enables API compose). */
  sourceId?: string;
  /** Voice profile applied when composing/rewriting (stays local). */
  voiceProfileId?: string;
}
