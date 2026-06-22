import type { PostStatus } from '../types';

/**
 * The editorial pipeline. This is the single source of truth for the stages a
 * piece of content moves through, used by the board columns, the editor's stage
 * picker, and the contextual "what to do next" hints.
 *
 * `failed` is not a pipeline stage of its own — a failed publish surfaces inside
 * the Scheduled column with a red badge so it's actionable.
 */
export interface StageMeta {
  status: PostStatus;
  /** Column / pill label. */
  label: string;
  /** One-line description of what this stage means. */
  description: string;
  /** Contextual guidance shown in the editor: what to do to move forward. */
  hint: string;
}

/** Stage accent colors (hex) for board dots and chips. Mirrors tailwind config. */
export const STAGE_COLOR: Record<PostStatus, string> = {
  brief: '#fbbf24',
  draft: '#94a3b8',
  review: '#c084fc',
  approved: '#2dd4bf',
  scheduled: '#38bdf8',
  published: '#34d399',
  learn: '#60a5fa',
  failed: '#f87171',
};

/** Ordered pipeline stages (left → right on the board). */
export const STAGE_ORDER: PostStatus[] = [
  'brief',
  'draft',
  'review',
  'approved',
  'scheduled',
  'published',
  'learn',
];

export const STAGE_META: Record<PostStatus, StageMeta> = {
  brief: {
    status: 'brief',
    label: 'Brief',
    description: 'The assignment',
    hint: 'Capture the objective, audience and the theme this post ladders up to, then start drafting.',
  },
  draft: {
    status: 'draft',
    label: 'Drafting',
    description: 'Hook, copy & visual',
    hint: 'Write the hook and copy and attach a visual. When it reads well, send it to Review.',
  },
  review: {
    status: 'review',
    label: 'Review',
    description: 'Being checked',
    hint: 'Someone is checking this for accuracy and brand. Approve it, or move it back to Drafting for changes.',
  },
  approved: {
    status: 'approved',
    label: 'Approved',
    description: 'Cleared to schedule',
    hint: 'Approved and ready. Set a date/time and move it to Scheduled.',
  },
  scheduled: {
    status: 'scheduled',
    label: 'Scheduled',
    description: 'On the calendar',
    hint: 'Queued to go out at the scheduled time. It publishes automatically, or publish it manually.',
  },
  published: {
    status: 'published',
    label: 'Published',
    description: 'Live',
    hint: 'This is live. Once you have results, move it to Learn to capture what worked.',
  },
  learn: {
    status: 'learn',
    label: 'Learn',
    description: 'Results & lessons',
    hint: 'Record the outcome and what you learned — it becomes input for the next brief.',
  },
  failed: {
    status: 'failed',
    label: 'Failed',
    description: 'Publish failed',
    hint: 'Publishing failed. Fix the issue and reschedule, or move it back to Approved.',
  },
};

/**
 * Board columns. Most map to a single status; the Scheduled column also catches
 * `failed` posts so a failed publish stays visible and actionable.
 */
export interface BoardColumn {
  /** Status applied when a card is dropped into this column. */
  status: PostStatus;
  label: string;
  description: string;
  /** All statuses rendered in this column. */
  statuses: PostStatus[];
}

export const BOARD_COLUMNS: BoardColumn[] = STAGE_ORDER.map((status) => ({
  status,
  label: STAGE_META[status].label,
  description: STAGE_META[status].description,
  statuses: status === 'scheduled' ? ['scheduled', 'failed'] : [status],
}));

/** The next stage in the pipeline, or null at the end. `failed` → `approved`. */
export function nextStage(status: PostStatus): PostStatus | null {
  if (status === 'failed') return 'approved';
  const i = STAGE_ORDER.indexOf(status);
  if (i === -1 || i === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}
