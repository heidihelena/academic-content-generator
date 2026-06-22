import type { ThreadDrafter, ThreadDraftResult, ThreadRequest } from './threadTypes';
import { MockThreadDrafter } from './mockThreadDrafter';
import { buildThreadMessages } from './threadPrompt';

/**
 * Thread-drafter facade. The app calls `draftThread(...)` and never constructs a
 * drafter directly; swapping the mock for a real model is a one-line change.
 */

let activeDrafter: ThreadDrafter = new MockThreadDrafter();

/** Override the active drafter (used by tests and the real-API switch). */
export function setThreadDrafter(drafter: ThreadDrafter): void {
  activeDrafter = drafter;
}

export function draftThread(request: ThreadRequest): Promise<ThreadDraftResult> {
  return activeDrafter.draft(request);
}

/**
 * Reference skeleton for a real LLM-backed drafter.
 *
 * // --- REAL API INTEGRATION POINT -----------------------------------------
 * // 1. Add the provider SDK + API key (from an env var, never hard-coded).
 * // 2. Send `buildThreadMessages(request)` with JSON-mode enabled.
 * // 3. Parse/validate { parts: string[] }; enforce the platform char limit.
 * // 4. Call setThreadDrafter(new LlmThreadDrafter()) at app startup.
 * // ------------------------------------------------------------------------
 */
export const __realApiReference = { buildThreadMessages };
