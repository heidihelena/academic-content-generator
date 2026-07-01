import { useState } from 'react';
import { setSourceStatus, useSourceMetaMap, SOURCE_STATUSES, type SourceStatus } from '../sources/sourceMeta';
import { SOURCE_KINDS, type SourceKind } from '../sources/sourcesTypes';
import type { StudioSeed } from '../studio/studioTypes';
import { LinkIcon, PlusIcon, SparkleIcon } from './icons';
import { Button, Card, ErrorState, Heading, Input, Spinner, Text } from './ui';
import {
  AddSourceForm,
  SourceCard,
  SourceDropZone,
  VaultSearchPanel,
  useSourceDeck,
  useSourceIdeas,
  useSourceList,
  useVaultSearch,
} from './source-inbox';

interface SourceInboxProps {
  /** Send a source into the Draft Studio (pre-fills the Compose stage). */
  onDraft: (seed: StudioSeed) => void;
}

const DEFAULT_META = { status: 'new' as SourceStatus };

/**
 * Source Inbox: collect and browse your research material — dropped files,
 * manually-added papers/links and live Obsidian vault notes — with the review
 * lifecycle (new → reviewed → used → archived) and filters to see what's still
 * waiting to be reused. Everything works locally; nothing is uploaded.
 */
export function SourceInbox({ onDraft }: SourceInboxProps) {
  const list = useSourceList();
  const vault = useVaultSearch();
  const ideas = useSourceIdeas();
  const deck = useSourceDeck();
  const metaMap = useSourceMetaMap();
  const [showForm, setShowForm] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [repurposeId, setRepurposeId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<SourceKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SourceStatus | 'all'>('all');

  const metaFor = (id: string) => metaMap[id] ?? DEFAULT_META;
  const visible = list.sources.filter((s) => {
    const meta = metaFor(s.id);
    if (kindFilter !== 'all' && s.kind !== kindFilter) return false;
    if (statusFilter === 'all') return meta.status !== 'archived';
    return meta.status === statusFilter;
  });

  const filterChip = (active: boolean) =>
    `rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
      active ? 'bg-brand-500/20 text-brand-strong' : 'bg-surface-800 text-slate-400 hover:text-slate-200'
    }`;

  return (
    <Card as="section" aria-label="Source Inbox" className="space-y-4 p-5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LinkIcon width={18} height={18} className="text-brand-400" />
          <div>
            <Heading>Source Inbox</Heading>
            <Text variant="muted">Papers, notes and links — plus your Obsidian vault. Pick one to draft from.</Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowVault((v) => !v)} aria-expanded={showVault}>
            <SparkleIcon width={14} height={14} /> Search vault
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
            <PlusIcon width={14} height={14} /> Add source
          </Button>
        </div>
      </header>

      <SourceDropZone onFiles={(files) => void list.addFiles(files)} />
      {list.notice && (
        <p role="status" data-testid="inbox-notice" className="text-xs text-brand-400">
          {list.notice}
        </p>
      )}

      {showVault && (
        <VaultSearchPanel
          query={vault.query}
          setQuery={vault.setQuery}
          hits={vault.hits}
          searched={vault.searched}
          busy={vault.busy}
          error={vault.error}
          notice={vault.notice}
          onSearch={vault.search}
          onReindex={vault.reindex}
          onDraft={onDraft}
        />
      )}

      <form onSubmit={list.submitSearch} className="flex gap-2">
        <Input
          aria-label="Search sources"
          placeholder="Search your sources…"
          value={list.query}
          onChange={(e) => list.setQuery(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by kind">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">Kind</span>
          <button type="button" className={filterChip(kindFilter === 'all')} onClick={() => setKindFilter('all')}>
            all
          </button>
          {SOURCE_KINDS.map((k) => (
            <button key={k} type="button" className={filterChip(kindFilter === k)} onClick={() => setKindFilter(k)}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">Status</span>
          <button type="button" className={filterChip(statusFilter === 'all')} onClick={() => setStatusFilter('all')}>
            active
          </button>
          {SOURCE_STATUSES.map((s) => (
            <button key={s} type="button" className={filterChip(statusFilter === s)} onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {showForm && <AddSourceForm onAdd={list.addSource} onDone={() => setShowForm(false)} />}

      {list.loading ? (
        <Spinner />
      ) : list.error ? (
        <ErrorState title="Couldn't load sources" message={list.error} onRetry={() => list.reload(list.query)} />
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          {list.sources.length === 0
            ? 'No sources yet. Drop a file above, add a paper or note, or set your Obsidian vault path in Settings.'
            : 'Nothing matches these filters.'}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="source-list">
          {visible.map((s) => (
            <SourceCard
              key={s.id}
              source={s}
              meta={metaFor(s.id)}
              onStatusChange={(status) => setSourceStatus(s.id, status)}
              onDraft={onDraft}
              repurpose={{
                open: repurposeId === s.id,
                onToggle: () => setRepurposeId((id) => (id === s.id ? null : s.id)),
              }}
              ideas={{
                open: ideas.activeId === s.id,
                busy: ideas.busy,
                error: ideas.error,
                items: ideas.ideas,
                onToggle: () => ideas.toggle(s),
                onRetry: () => ideas.retry(s),
              }}
              deck={{
                open: deck.activeId === s.id,
                busy: deck.busy,
                error: deck.error,
                result: deck.deck,
                onToggle: () => deck.toggle(s),
                onRetry: () => deck.retry(s),
                onDownload: () => deck.download(s.title),
              }}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
