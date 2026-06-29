import { type HTMLAttributes } from 'react';
import { cva } from './cva';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'review';
export type BadgeSize = 'pill' | 'chip';

/**
 * A small status/label token. Two shapes:
 *  - `pill` (default): rounded-full, for short labels ("Configured", "3 posts").
 *  - `chip`: squared + uppercase, for tiny category tags (kind, channel, score).
 *
 * For a post's lifecycle status use `StatusBadge` (PlatformBadge.tsx), which
 * carries the canonical per-stage colors; this is the generic primitive.
 */
const badge = cva('inline-flex items-center font-medium', {
  variants: {
    tone: {
      neutral: 'bg-surface-700 text-slate-300',
      brand: 'bg-brand-500/15 text-brand-400',
      success: 'bg-status-published/15 text-status-published',
      warn: 'bg-status-brief/15 text-status-brief',
      danger: 'bg-status-failed/15 text-status-failed',
      info: 'bg-status-review/15 text-status-review',
      review: 'bg-vahtian-accent/15 text-vahtian-accent', // academic-integrity accent
    },
    size: {
      pill: 'rounded-full px-2 py-0.5 text-[11px]',
      chip: 'rounded px-1.5 py-0.5 text-[10px] uppercase',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'pill' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
}

export function Badge({ tone, size, className, ...props }: BadgeProps) {
  return <span className={badge({ tone, size, className })} {...props} />;
}
