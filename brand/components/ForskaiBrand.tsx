/**
 * Forskai Studio — example brand components.
 * Tailwind classes reference brand/tailwind.brand.cjs tokens (create/verify/ready/review/stop + neutrals).
 * These are reference implementations: copy into content-calendar/src and adapt.
 */
import * as React from 'react';

/* ------------------------------------------------------------------ Logo */
export function ForskaiMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Forskai Studio">
      <path d="M42.9 37.1 A12 12 0 1 1 42.9 26.9" stroke="var(--fs-verify)" strokeWidth="3" strokeLinecap="round" />
      <path d="M42.9 16.4 A19 19 0 0 1 42.9 47.6" stroke="var(--fs-create)" strokeWidth="3" strokeLinecap="round" />
      <path d="M50.4 13.6 A26 26 0 0 1 50.4 50.4" stroke="var(--fs-create)" strokeWidth="3" strokeLinecap="round" opacity={0.55} />
      <circle cx="32" cy="32" r="5" fill="var(--fs-ink)" />
    </svg>
  );
}

export function ForskaiLockup() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <ForskaiMark size={26} />
      <span className="text-ui-xl font-ui tracking-tight">
        <span className="font-semibold text-ink">forskai</span>
        <span className="font-normal text-muted/60">&nbsp;·&nbsp;</span>
        <span className="font-normal text-muted">Studio</span>
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- Button */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: 'create' | 'verify' | 'neutral' | 'danger';
  variant?: 'solid' | 'soft' | 'ghost';
};
export function Button({ intent = 'neutral', variant = 'solid', className = '', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-ui-base font-medium ' +
    'font-ui transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50';
  const tone = {
    create: { solid: 'bg-create text-white hover:brightness-110 focus-visible:ring-create', soft: 'bg-create-soft text-create hover:brightness-105 focus-visible:ring-create', ghost: 'text-create hover:bg-create-soft focus-visible:ring-create' },
    verify: { solid: 'bg-verify text-white hover:brightness-110 focus-visible:ring-verify', soft: 'bg-verify-soft text-verify hover:brightness-105 focus-visible:ring-verify', ghost: 'text-verify hover:bg-verify-soft focus-visible:ring-verify' },
    neutral:{ solid: 'bg-ink text-bg hover:brightness-110 focus-visible:ring-muted', soft: 'bg-surface-2 text-ink hover:brightness-95 focus-visible:ring-muted', ghost: 'text-ink-soft hover:bg-surface-2 focus-visible:ring-muted' },
    danger: { solid: 'bg-stop text-white hover:brightness-110 focus-visible:ring-stop', soft: 'bg-stop-soft text-stop hover:brightness-105 focus-visible:ring-stop', ghost: 'text-stop hover:bg-stop-soft focus-visible:ring-stop' },
  }[intent][variant];
  return <button className={`${base} ${tone} ${className}`} {...rest} />;
}

/* ------------------------------------------------------------------- Card */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface border border-border rounded-lg shadow-card p-5 ${className}`}>{children}</div>;
}

/* ----------------------------------------------------------- StatusBadge */
export type Status = 'ready' | 'review' | 'blocked' | 'create' | 'verify' | 'neutral';
const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  ready:   { label: 'Ready',         cls: 'bg-ready-soft text-ready',    dot: 'bg-ready' },
  review:  { label: 'Needs review',  cls: 'bg-review-soft text-review',  dot: 'bg-review-accent' },
  blocked: { label: 'Blocked',       cls: 'bg-stop-soft text-stop',      dot: 'bg-stop' },
  create:  { label: 'Drafting',      cls: 'bg-create-soft text-create',  dot: 'bg-create' },
  verify:  { label: 'In review',     cls: 'bg-verify-soft text-verify',  dot: 'bg-verify' },
  neutral: { label: 'Draft',         cls: 'bg-surface-2 text-ink-soft',  dot: 'bg-muted' },
};
export function StatusBadge({ status, children }: { status: Status; children?: React.ReactNode }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-pill text-ui-xs font-medium ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-pill ${s.dot}`} aria-hidden />
      {children ?? s.label}
    </span>
  );
}

/* ---------------------------------------------------------- VerdictBadge */
/* Forskai design-intelligence verdict (forskai.com): PASS / RISK / FAIL. */
export type Verdict = 'PASS' | 'RISK' | 'FAIL';
const VERDICT: Record<Verdict, string> = {
  PASS: 'bg-ready-soft text-ready border-ready',
  RISK: 'bg-review-soft text-review border-review-accent',
  FAIL: 'bg-stop-soft text-stop border-stop',
};
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`inline-flex items-center h-7 px-3 rounded-md border font-mono text-ui-sm font-medium tracking-wide ${VERDICT[verdict]}`}>
      {verdict}
    </span>
  );
}

/* ----------------------------------------------------------- ReviewPanel */
export function ReviewPanel({ title, severity, children }: { title: string; severity: 'review' | 'blocked' | 'ready'; children: React.ReactNode }) {
  const edge = { review: 'border-l-review-accent', blocked: 'border-l-stop', ready: 'border-l-ready' }[severity];
  return (
    <aside className={`bg-surface border border-border border-l-4 ${edge} rounded-md p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <StatusBadge status={severity === 'blocked' ? 'blocked' : severity === 'ready' ? 'ready' : 'review'} />
        <h3 className="text-ui-md font-semibold text-ink">{title}</h3>
      </div>
      <div className="text-ui-base text-ink-soft">{children}</div>
    </aside>
  );
}

/* ----------------------------------------------------- ExportReadiness */
export function ExportReadiness({ state }: { state: 'ready' | 'review' | 'blocked' }) {
  const map = {
    ready:   { s: 'ready' as Status,   msg: 'All claims supported by cited sources. Export is clear.' },
    review:  { s: 'review' as Status,  msg: 'Some claims still need review before export.' },
    blocked: { s: 'blocked' as Status, msg: 'Export blocked: unsupported or overclaiming statements remain.' },
  }[state];
  return (
    <div className="flex items-center justify-between gap-4 bg-surface border border-border rounded-md p-4">
      <div className="flex items-center gap-3">
        <StatusBadge status={map.s} />
        <p className="text-ui-base text-ink-soft">{map.msg}</p>
      </div>
      <Button intent={state === 'ready' ? 'create' : 'neutral'} variant={state === 'ready' ? 'solid' : 'soft'} disabled={state === 'blocked'}>
        Export
      </Button>
    </div>
  );
}

/* ------------------------------------------------------ AuditTrailEntry */
export function AuditTrailEntry({ time, actor, action, ref }: { time: string; actor: string; action: string; ref?: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 font-mono text-ui-sm border-b border-border last:border-0">
      <time className="text-muted tabular-nums">{time}</time>
      <span className="text-ink-soft">
        <span className="text-verify">{actor}</span> {action}
        {ref && <span className="text-muted"> · {ref}</span>}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------ EmptyState */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16">
      <ForskaiMark size={40} />
      <h2 className="text-ui-lg font-heading text-ink">{title}</h2>
      <p className="text-ui-base text-muted max-w-sm">{body}</p>
      {action}
    </div>
  );
}
