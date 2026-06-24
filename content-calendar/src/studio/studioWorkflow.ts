import type { ReviewState, StudioInput } from './studioTypes';

/**
 * The Draft Studio workflow as a pure state machine. The human drives it with
 * back/forward controls; advancing past Review is gated on the safety review
 * clearing, so unsafe drafts must be sent back and revised first.
 *
 * The work of each forward step (composing the draft, running the review) is
 * async and lives in `studioEngine`; this module only owns the stages, the
 * guards, and going back.
 */

export const STUDIO_STAGES = ['compose', 'draft', 'review', 'ready'] as const;
export type StudioStage = (typeof STUDIO_STAGES)[number];

export interface StudioState {
  stage: StudioStage;
  input: StudioInput;
  draft: string;
  review: ReviewState | null;
}

export function emptyInput(): StudioInput {
  return { title: '', material: '', channel: 'linkedin', audience: 'peers', hook: '' };
}

export function initialState(): StudioState {
  return { stage: 'compose', input: emptyInput(), draft: '', review: null };
}

const BACK: Record<StudioStage, StudioStage | null> = {
  compose: null,
  draft: 'compose',
  review: 'draft',
  ready: 'review',
};

export function canGoBack(state: StudioState): boolean {
  return BACK[state.stage] !== null;
}

/** Whether the author may move forward from the current stage. */
export function canGoForward(state: StudioState): boolean {
  switch (state.stage) {
    case 'compose':
      return state.input.title.trim() !== '' && state.input.material.trim() !== '';
    case 'draft':
      return state.draft.trim() !== '';
    case 'review':
      // Gate: cannot proceed to export with an unresolved `block` finding.
      return state.review?.cleared === true;
    case 'ready':
      return false;
  }
}

/** Send the draft back one stage to revise. */
export function goBack(state: StudioState): StudioState {
  const prev = BACK[state.stage];
  if (!prev) return state;
  // Leaving Review invalidates the prior review; it re-runs on the next advance.
  const review = state.stage === 'review' ? null : state.review;
  return { ...state, stage: prev, review };
}
