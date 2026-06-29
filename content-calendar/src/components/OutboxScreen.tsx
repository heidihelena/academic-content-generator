import { useStore } from '../store/useStore';
import type { Post } from '../types';
import { getPlatformMeta } from '../lib/platforms';
import { PLATFORM_GLYPHS } from './icons';

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

function Row({ post }: { post: Post }) {
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
      </div>
    </li>
  );
}

function Group({ title, posts, empty }: { title: string; posts: Post[]; empty: string }) {
  return (
    <section aria-label={title} className="card space-y-2 p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        <span className="text-[11px] text-slate-500">{posts.length}</span>
      </header>
      {posts.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <Row key={p.id} post={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function OutboxScreen() {
  const posts = useStore((s) => s.posts);

  const byTime = (a: Post, b: Post) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  const published = posts.filter((p) => p.status === 'published').sort(byTime);
  const scheduled = posts
    .filter((p) => p.status === 'scheduled')
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  const failed = posts.filter((p) => p.status === 'failed').sort(byTime);

  return (
    <div className="space-y-4" data-testid="outbox">
      <Group title="Failed" posts={failed} empty="Nothing failed — good." />
      <Group title="Scheduled" posts={scheduled} empty="Nothing scheduled yet." />
      <Group title="Published" posts={published} empty="Nothing published yet." />
    </div>
  );
}
