import type { ThreadAudience } from './threadTypes';

/**
 * Types for the "Video → Shorts plan" feature. Mirrors the other AI seams: a
 * deterministic mock ships today; a real LLM client can drop in later.
 */

export interface ShortsRequest {
  /** The long-form transcript (ideally with timestamps). */
  transcript: string;
  /** Optional source video URL — used to deep-link each clip's start time. */
  videoUrl?: string;
  /** How many shorts to propose. */
  count: number;
  audience: ThreadAudience;
}

export interface ShortIdea {
  id: string;
  /** Short, punchy working title for the clip. */
  title: string;
  /** Opening hook line. */
  hook: string;
  /** Suggested caption/description for the Short. */
  caption: string;
  /** Cut points in seconds (absent when the transcript had no timestamps). */
  startSeconds?: number;
  endSeconds?: number;
  /** Human-readable range, e.g. "1:30–2:05". */
  timeRange?: string;
}

export interface ShortsPlanResult {
  request: ShortsRequest;
  shorts: ShortIdea[];
  /** Which planner produced the result (mock vs. a real model). */
  source: string;
}

export interface ShortsPlanner {
  readonly name: string;
  plan(request: ShortsRequest): Promise<ShortsPlanResult>;
}
