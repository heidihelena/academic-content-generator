import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { listSources } from '../sources/sourcesClient';
import { getSourceMeta, useSourceMetaMap } from '../sources/sourceMeta';
import type { Source } from '../sources/sourcesTypes';
import { reviewDraft } from '../studio/studioReview';
import type { View } from './Sidebar';
import { CheckIcon } from './icons';
import { Badge, Button, Callout, Card, Heading, Text } from './ui';

/**
 * Home — the landing screen. A short getting-started checklist (so a new user
 * knows the first moves) plus a quiet dashboard over the research memory:
 * recent sources, what needs review, what's ready to go, and any drafts the
 * safety reviewer would block. Everything is derived locally (store +
 * localStorage + the sources client), so it works offline and updates as you go.
 */
const REVIEW_STATES = ['brief', 'draft', 'review'];

export function HomeScreen({ onNavigate }: { onNavigate: (view: View) => void }) {
  const posts = useStore((s) => s.posts);
  const accounts = useStore((s) => s.accounts);
  const sourceMetaMap = useSourceMetaMap();

  const [sources, setSources] = useState<Source[] | null>(null);
  const [sourcesFailed, setSourcesFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSources()
      .then((list) => {
        if (!cancelled) setSources(list);
      })
      .catch(() => {
        if (!cancelled) setSourcesFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = accounts.filter((a) => a.status === 'connected').length;
  const published = posts.filter((p) => p.status === 'published').length;
  const approved = posts.filter((p) => p.status === 'approved').length;
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;

  const needsReview = useMemo(
    () => posts.filter((p) => REVIEW_STATES.includes(p.status)),
    [posts],
  );

  /** Drafts in review whose body trips a blocking safety finding (peer review). */
  const blockedCount = useMemo(
    () =>
      needsReview.filter((p) =>
        reviewDraft(p.body, 'peers').findings.some((f) => f.severity === 'block'),
      ).length,
    [needsReview],
  );

  /** Sources still marked new/reviewed — not yet turned into content. */
  const unusedSources = useMemo(() => {
    if (!sources) return 0;
    // sourceMetaMap subscribes this component to meta changes; getSourceMeta
    // reads the same store (with the 'new' default for unseen sources).
    void sourceMetaMap;
    return sources.filter((s) => {
      const status = getSourceMeta(s.id).status;
      return status === 'new' || status === 'reviewed';
    }).length;
  }, [sources, sourceMetaMap]);

  const steps: Array<{ done: boolean; label: string; cta: string; to: View }> = [
    { done: connected > 0, label: 'Connect a publishing account', cta: 'Connections', to: 'connections' },
    { done: posts.length > 0, label: 'Bring in a source and draft from it', cta: 'Source Inbox', to: 'inbox' },
    { done: published > 0, label: 'Publish your first post', cta: 'Outbox', to: 'outbox' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="home">
      <Card as="section" aria-label="Getting started" className="space-y-3 p-5">
        <Heading>Getting started</Heading>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    s.done ? 'bg-status-published/20 text-status-published' : 'border border-surface-600 text-transparent'
                  }`}
                >
                  <CheckIcon width={11} height={11} />
                </span>
                <span className={s.done ? 'text-slate-400 line-through' : 'text-slate-200'}>{s.label}</span>
              </span>
              {!s.done && (
                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => onNavigate(s.to)}>
                  {s.cta} →
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {blockedCount > 0 && (
        <Callout tone="danger" data-testid="safety-blocks" className="flex items-center justify-between gap-3">
          <span>
            {blockedCount} {blockedCount === 1 ? 'draft has' : 'drafts have'} blocking safety findings
          </span>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => onNavigate('review')}>
            Review →
          </Button>
        </Callout>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card as="section" aria-label="Needs your review" className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <Heading>Needs your review</Heading>
            <Badge tone={needsReview.length > 0 ? 'info' : 'neutral'}>{needsReview.length}</Badge>
          </div>
          {needsReview.length === 0 ? (
            <Text variant="muted">Nothing waiting on you.</Text>
          ) : (
            <ul className="space-y-1.5">
              {needsReview.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm text-slate-300">
                  <Badge size="chip">{p.status}</Badge>
                  <span className="truncate">{p.hook || p.body || 'Untitled draft'}</span>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" onClick={() => onNavigate('review')}>
            Review queue →
          </Button>
        </Card>

        <Card as="section" aria-label="Ready to publish" className="space-y-2 p-4">
          <Heading>Ready to publish</Heading>
          <ul className="space-y-1.5">
            <li className="flex items-center justify-between gap-2 text-sm text-slate-300">
              <span>
                {approved} approved {approved === 1 ? 'post' : 'posts'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('outbox')}>
                Publish queue →
              </Button>
            </li>
            <li className="flex items-center justify-between gap-2 text-sm text-slate-300">
              <span>{scheduled} scheduled</span>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')}>
                Calendar →
              </Button>
            </li>
          </ul>
        </Card>
      </div>

      <Card as="section" aria-label="Recent sources" className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <Heading>Recent sources</Heading>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('inbox')}>
            Source Inbox →
          </Button>
        </div>
        {sourcesFailed ? (
          <Text variant="muted">Sources are unavailable right now.</Text>
        ) : !sources ? (
          <Text variant="muted">Loading sources…</Text>
        ) : sources.length === 0 ? (
          <Text variant="muted">No sources yet — bring in a paper or a note.</Text>
        ) : (
          <ul className="space-y-1.5">
            {sources.slice(0, 3).map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm text-slate-300">
                <Badge size="chip">{s.kind}</Badge>
                <span className="truncate">{s.title}</span>
              </li>
            ))}
          </ul>
        )}
        {sources && unusedSources > 0 && (
          <div aria-label="Sources not yet reused" className="flex items-center justify-between gap-2 border-t border-surface-700 pt-2">
            <Text variant="tiny" as="span">
              {unusedSources} {unusedSources === 1 ? 'source' : 'sources'} waiting to be reused
            </Text>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('inbox')}>
              Revisit →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
