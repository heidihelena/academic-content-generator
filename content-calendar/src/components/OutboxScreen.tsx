import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Post } from '../types';
import { getPlatformMeta } from '../lib/platforms';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/dateUtils';
import { PLATFORM_GLYPHS } from './icons';
import { Button, Callout, Card, ConfirmDialog, Heading, Input, Label, Modal } from './ui';

/**
 * Outbox — one place to see what's gone out, what's queued, and what failed,
 * across every connected destination. Sourced from the post store (the model
 * the live "Publish now" path writes to); grouped by state so a failed publish
 * doesn't get lost on a board column.
 */
function fmt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

function Row({
  post,
  onEdit,
  onSchedule,
  onPublish,
  isPublishing,
  canPublish,
}: {
  post: Post;
  onEdit: (postId: string) => void;
  onSchedule?: (postId: string) => void;
  onPublish?: (postId: string) => void;
  isPublishing?: boolean;
  canPublish?: boolean;
}) {
  const meta = getPlatformMeta(post.platform);
  const Glyph = PLATFORM_GLYPHS[post.platform];
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Glyph width={14} height={14} />
          <span className="text-[11px] uppercase tracking-wide text-slate-500">{meta.name}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-200">{post.body || '(no text)'}</p>
        {post.status === 'failed' && post.statusDetail && (
          <p className="mt-1 text-[11px] text-status-failed">{post.statusDetail}</p>
        )}
      </div>
      <div className="shrink-0 text-right text-[11px] text-slate-500">
        {post.status === 'published' && (
          <>
            <div>{fmt(post.publishedAt)}</div>
            {post.permalink && (
              <a className="text-sky-400 hover:underline" href={post.permalink} target="_blank" rel="noreferrer">
                view post
              </a>
            )}
          </>
        )}
        {post.status === 'scheduled' && <div>{fmt(post.scheduledAt)}</div>}
        {post.status !== 'published' && (
          <div className="mt-2 flex flex-wrap justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => onEdit(post.id)}>
              Edit
            </Button>
            {onSchedule && post.status === 'approved' && (
              <Button variant="secondary" size="sm" onClick={() => onSchedule(post.id)}>
                Schedule
              </Button>
            )}
            {onPublish && (
              <Button
                size="sm"
                loading={isPublishing}
                disabled={!canPublish || isPublishing}
                title={canPublish ? undefined : `Connect ${meta.name} before publishing`}
                onClick={() => onPublish(post.id)}
              >
                Publish now
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Group({
  title,
  posts,
  empty,
  onEdit,
  onSchedule,
  onPublish,
  publishingId,
  canPublish,
}: {
  title: string;
  posts: Post[];
  empty: string;
  onEdit: (postId: string) => void;
  onSchedule?: (postId: string) => void;
  onPublish?: (postId: string) => void;
  publishingId?: string | null;
  canPublish?: (post: Post) => boolean;
}) {
  return (
    <Card as="section" aria-label={title} className="space-y-2 p-4">
      <header className="flex items-center justify-between">
        <Heading>{title}</Heading>
        <span className="text-[11px] text-slate-500">{posts.length}</span>
      </header>
      {posts.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <Row
              key={p.id}
              post={p}
              onEdit={onEdit}
              onSchedule={onSchedule}
              onPublish={onPublish}
              isPublishing={publishingId === p.id}
              canPublish={canPublish?.(p) ?? true}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Result of the most recent publish, shown as a banner at the point of action. */
type PublishOutcome =
  | { kind: 'success'; platform: Post['platform']; permalink?: string }
  | { kind: 'error'; platform: Post['platform']; message: string };

export function OutboxScreen() {
  const posts = useStore((s) => s.posts);
  const accounts = useStore((s) => s.accounts);
  const openEditor = useStore((s) => s.openEditor);
  const schedulePost = useStore((s) => s.schedulePost);
  const publishPost = useStore((s) => s.publishPost);
  const publishingId = useStore((s) => s.publishingId);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState('');
  // Publishing is public and irreversible — confirm before it fires (matching
  // the post editor), then report the outcome so success/failure is never
  // silently inferred from a row quietly changing groups.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PublishOutcome | null>(null);
  const schedulingPost = schedulingId ? posts.find((p) => p.id === schedulingId) ?? null : null;
  const confirmingPost = confirmingId ? posts.find((p) => p.id === confirmingId) ?? null : null;

  const runPublish = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    setConfirmingId(null);
    setOutcome(null);
    const ok = await publishPost(postId);
    const platform = post?.platform ?? 'bluesky';
    if (ok) {
      const fresh = useStore.getState().posts.find((p) => p.id === postId);
      setOutcome({ kind: 'success', platform, permalink: fresh?.permalink });
    } else {
      setOutcome({
        kind: 'error',
        platform,
        message: useStore.getState().publishError ?? 'Publish failed.',
      });
    }
  };

  // Approved posts whose destination account isn't connected — the real reason
  // "Publish now" is greyed out. Surface it as a banner, not just a tooltip.
  const blockedPlatforms = Array.from(
    new Set(
      posts
        .filter((p) => p.status === 'approved')
        .filter((p) => accounts.find((a) => a.platform === p.platform)?.status !== 'connected')
        .map((p) => p.platform),
    ),
  );

  const byTime = (a: Post, b: Post) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  const ready = posts.filter((p) => p.status === 'approved').sort(byTime);
  const published = posts.filter((p) => p.status === 'published').sort(byTime);
  const scheduled = posts
    .filter((p) => p.status === 'scheduled')
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  const failed = posts.filter((p) => p.status === 'failed').sort(byTime);
  const canPublish = (post: Post) =>
    post.body.trim().length > 0 &&
    post.body.length <= getPlatformMeta(post.platform).characterLimit &&
    accounts.find((a) => a.platform === post.platform)?.status === 'connected';
  const openSchedule = (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    setSchedulingId(id);
    setScheduleValue(toDateTimeLocalValue(post.scheduledAt));
  };
  const closeSchedule = () => {
    setSchedulingId(null);
    setScheduleValue('');
  };
  const confirmSchedule = () => {
    if (!schedulingId || !scheduleValue) return;
    schedulePost(schedulingId, fromDateTimeLocalValue(scheduleValue));
    closeSchedule();
  };

  return (
    <div className="space-y-4" data-testid="outbox">
      {outcome?.kind === 'success' && (
        <Callout tone="good" data-testid="publish-success" className="flex items-center justify-between gap-3">
          <span>Published to {getPlatformMeta(outcome.platform).name}.</span>
          {outcome.permalink && (
            <a className="shrink-0 underline" href={outcome.permalink} target="_blank" rel="noreferrer">
              View post
            </a>
          )}
        </Callout>
      )}
      {outcome?.kind === 'error' && (
        <Callout tone="danger" data-testid="publish-error" className="flex items-center justify-between gap-3">
          <span>
            Couldn’t publish to {getPlatformMeta(outcome.platform).name}: {outcome.message}
          </span>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setOutcome(null)}>
            Dismiss
          </Button>
        </Callout>
      )}
      {blockedPlatforms.length > 0 && (
        <Callout tone="warn" data-testid="connect-first" className="flex items-center justify-between gap-3">
          <span>
            Connect{' '}
            {blockedPlatforms.map((p) => getPlatformMeta(p).name).join(', ')}{' '}
            before you can publish {blockedPlatforms.length === 1 ? 'that post' : 'those posts'}.
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              window.location.hash = '#/connections';
            }}
          >
            Connections →
          </Button>
        </Callout>
      )}
      {posts.length === 0 ? (
        <Card as="section" className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-slate-400">
            Nothing here yet. Write a post and approve it, and it’ll be ready to publish here.
          </p>
          <Button size="sm" onClick={() => { window.location.hash = '#/studio'; }}>
            Open Draft Studio →
          </Button>
        </Card>
      ) : (
        <>
          <Group
            title="Ready to post"
            posts={ready}
            empty="Nothing approved yet."
            onEdit={openEditor}
            onSchedule={openSchedule}
            onPublish={setConfirmingId}
            publishingId={publishingId}
            canPublish={canPublish}
          />
          <Group
            title="Failed"
            posts={failed}
            empty="Nothing failed — good."
            onEdit={openEditor}
            onPublish={setConfirmingId}
            publishingId={publishingId}
            canPublish={canPublish}
          />
          <Group
            title="Scheduled"
            posts={scheduled}
            empty="Nothing scheduled yet."
            onEdit={openEditor}
            onPublish={setConfirmingId}
            publishingId={publishingId}
            canPublish={canPublish}
          />
          <Group title="Published" posts={published} empty="Nothing published yet." onEdit={openEditor} />
        </>
      )}
      <ConfirmDialog
        open={Boolean(confirmingPost)}
        title="Publish now?"
        message={
          confirmingPost
            ? `This posts publicly to ${getPlatformMeta(confirmingPost.platform).name} right now. You can’t unpublish it from here.`
            : ''
        }
        confirmLabel="Publish now"
        onCancel={() => setConfirmingId(null)}
        onConfirm={() => confirmingId && void runPublish(confirmingId)}
      />
      <Modal
        open={Boolean(schedulingPost)}
        title="Schedule post"
        onClose={closeSchedule}
        widthClass="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeSchedule}>
              Cancel
            </Button>
            <Button onClick={confirmSchedule} disabled={!scheduleValue}>
              Confirm schedule
            </Button>
          </>
        }
      >
        {schedulingPost && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              Choose exactly when this {getPlatformMeta(schedulingPost.platform).name} post should move to Scheduled.
            </p>
            <div>
              <Label htmlFor="outbox-schedule-at">Date and time</Label>
              <Input
                id="outbox-schedule-at"
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
              />
            </div>
            <p className="line-clamp-3 rounded-lg border border-surface-700 bg-surface-900/50 p-3 text-xs text-slate-400">
              {schedulingPost.body || '(no text)'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
