import type { HTMLAttributes, ReactNode } from 'react';
import { cva } from './cva';

export type CalloutTone = 'good' | 'warn' | 'danger' | 'info';

const callout = cva('rounded-lg border px-3 py-2 text-[11px] leading-relaxed', {
  variants: {
    tone: {
      good: 'border-status-published/40 bg-status-published/10 text-status-published',
      warn: 'border-status-brief/40 bg-status-brief/10 text-status-brief',
      danger: 'border-status-failed/40 bg-status-failed/10 text-status-failed',
      info: 'border-brand-500/40 bg-brand-500/5 text-slate-200',
    },
  },
  defaultVariants: { tone: 'info' },
});

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CalloutTone;
  /** Forwarded so callers can keep stable test ids on review/check messages. */
  'data-testid'?: string;
  children: ReactNode;
}

/**
 * A tone-driven inline message box. One place for the good/warn/danger/info
 * treatment so the editor's readability, reach, review and error notices stop
 * re-deriving the same border+bg+text class triples. `role="status"` by default
 * so updates are announced politely.
 */
export function Callout({ tone, className, role = 'status', children, ...props }: CalloutProps) {
  return (
    <div role={role} className={callout({ tone, className })} {...props}>
      {children}
    </div>
  );
}
