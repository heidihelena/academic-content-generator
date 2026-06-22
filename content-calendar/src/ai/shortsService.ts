import type { ShortsPlanner, ShortsPlanResult, ShortsRequest } from './shortsTypes';
import { MockShortsPlanner } from './mockShortsPlanner';
import { buildShortsMessages } from './shortsPrompt';

/**
 * Shorts-planner facade. The app calls `planShortsFromVideo(...)` and never
 * constructs a planner directly; swapping the mock for a real model is one line.
 */

let activePlanner: ShortsPlanner = new MockShortsPlanner();

export function setShortsPlanner(planner: ShortsPlanner): void {
  activePlanner = planner;
}

export function planShortsFromVideo(request: ShortsRequest): Promise<ShortsPlanResult> {
  return activePlanner.plan(request);
}

/**
 * Reference skeleton for a real LLM-backed planner.
 *
 * // --- REAL API INTEGRATION POINT -----------------------------------------
 * // Send `buildShortsMessages(request)` with JSON-mode, validate { shorts },
 * // then call setShortsPlanner(new LlmShortsPlanner()) at startup. A fuller
 * // version would also fetch the transcript from a YouTube URL server-side.
 * // ------------------------------------------------------------------------
 */
export const __realApiReference = { buildShortsMessages };
