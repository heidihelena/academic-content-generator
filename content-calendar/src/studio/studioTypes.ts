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
] as const;
export type StudioChannel = (typeof STUDIO_CHANNELS)[number];

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

/** A source handed off from the Source Inbox to pre-fill the Compose stage. */
export interface StudioSeed {
  title: string;
  material: string;
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
}
