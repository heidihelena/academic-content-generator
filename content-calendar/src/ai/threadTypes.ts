import type { Platform } from '../types';

/**
 * Types for the "Abstract → thread" drafter.
 *
 * Mirrors the IdeaGenerator seam: a deterministic mock ships today and a real
 * LLM client can drop in later without touching the UI. Turns a paper abstract
 * into an accessible, platform-sized draft thread the researcher then edits.
 */

/** Who the thread is written for — shapes the framing line. */
export type ThreadAudience =
  | 'general public'
  | 'fellow researchers'
  | 'students'
  | 'policymakers'
  | 'journalists';

export const THREAD_AUDIENCES: ThreadAudience[] = [
  'general public',
  'fellow researchers',
  'students',
  'policymakers',
  'journalists',
];

/** User inputs for drafting a thread. */
export interface ThreadRequest {
  /** The paper abstract (or any dense paragraph) to turn into a thread. */
  abstract: string;
  audience: ThreadAudience;
  platform: Platform;
  /** Optional DOI/URL appended as the closing "read more" line. */
  sourceUrl?: string;
}

export interface ThreadDraftResult {
  request: ThreadRequest;
  /** The thread, one string per post, each within the platform limit. */
  parts: string[];
  /** Which drafter produced the result (mock vs. a real model). */
  source: string;
}

/** The contract every thread drafter implements. */
export interface ThreadDrafter {
  readonly name: string;
  draft(request: ThreadRequest): Promise<ThreadDraftResult>;
}
