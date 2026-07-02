import { useMemo, useState } from 'react';
import { classifyIssues, type IssueSeverity } from '../review/reviewIssues';
import { useStore } from '../store/useStore';
import type { StudioAudience } from '../studio/studioTypes';
import type { Post } from '../types';
import { CheckIcon } from './icons';
import { Badge, Button, Card, Heading, Text } from './ui';

/**
 * Review Queue — every draft that still needs a human look, with its claim and
 * safety issues classified and graded (see `review/reviewIssues`). Blocking
 * issues gate approval until the draft is edited or the author explicitly
 * overrides.
 */

const NEEDS_REVIEW: ReadonlyArray<Post['status']> = ['brief', 'draft', 'review'];

const SEVERITY_BADGE: Record<IssueSeverity, string> = {
  blocking: 'bg-status-failed/15 text-status-failed',
  high: 'bg-amber-500/20 text-amber-400',
  medium: 'bg-amber-500/10 text-amber-500',
  low: 'bg-surface-700 text-slate-300',
};

function guessAudience(post: Post): StudioAudience {
  const a = (post.audience ?? '').toLowerCase();
  if (a.includes('patient')) return 'patients';
  if (a.includes('public')) return 'public';
  if (a.includes('student')) return 'students';
  return 'peers';
}

function QueueEntry({ post }: { post: Post }) {
  const openEditor = useStore((s) => s.openEditor);
  const approvePost = useStore((s) => s.approvePost);
  const [override, setOverride] = useState(false);

  const issues = useMemo(() => classifyIssues(post.body, guessAudience(post)), [post]);
  const blocked = issues.some((i) => i.severity === 'blocking');
  const overrideId = `override-${post.id}`;

  return (
    <li className="space-y-2.5 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5" data-testid="review-entry">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge size="chip">{post.platform}</Badge>
            <Badge size="chip">{post.status}</Badge>
            {blocked ? (
              <Badge tone="danger" size="chip">
                blocked
              </Badge>
            ) : issues.length > 0 ? (
              <Badge tone="warn" size="chip">
                {issues.length} to check
              </Badge>
            ) : (
              <Badge tone="success" size="chip">
                no flags
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{post.body}</p>
          {post.source?.title && <p className="mt-0.5 text-[11px] text-slate-500">Source: {post.source.title}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => openEditor(post.id)}>
            Open &amp; edit
          </Button>
          <Button size="sm" disabled={blocked && !override} onClick={() => approvePost(post.id)}>
            <CheckIcon width={13} height={13} /> Approve
          </Button>
        </div>
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1" data-testid="review-issues">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold uppercase ${SEVERITY_BADGE[issue.severity]}`}>
                {issue.severity}
              </span>
              <span className="text-slate-300">
                <span className="text-slate-500">{issue.type}:</span> {issue.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {blocked && (
        <label htmlFor={overrideId} className="flex items-center gap-2 text-[11px] text-slate-400">
          <input
            id={overrideId}
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand-500"
          />
          I have reviewed the blocking issues myself and take responsibility for approving this draft.
        </label>
      )}
    </li>
  );
}

export function ReviewQueueScreen() {
  const posts = useStore((s) => s.posts);
  const queue = useMemo(
    () =>
      posts
        .filter((p) => NEEDS_REVIEW.includes(p.status))
        .sort((a, b) => {
          const blockedA = classifyIssues(a.body, guessAudience(a)).some((i) => i.severity === 'blocking');
          const blockedB = classifyIssues(b.body, guessAudience(b)).some((i) => i.severity === 'blocking');
          return Number(blockedB) - Number(blockedA);
        }),
    [posts],
  );

  return (
    <Card as="section" aria-label="Review Queue" className="space-y-4 p-5">
      <header className="flex items-center gap-2">
        <CheckIcon width={18} height={18} className="text-verify-400" />
        <div>
          <Heading>Review Queue</Heading>
          <Text variant="muted">
            Drafts waiting for a human look. The app flags what to check — it never decides scientific truth for you.
          </Text>
        </div>
      </header>

      {queue.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          Nothing waiting for review. Drafts land here from the Draft Studio and the pipeline.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="review-queue">
          {queue.map((post) => (
            <QueueEntry key={post.id} post={post} />
          ))}
        </ul>
      )}
    </Card>
  );
}
