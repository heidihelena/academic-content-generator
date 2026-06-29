import { useState } from 'react';
import type { StudioSeed } from '../studio/studioTypes';
import { LinkIcon, PlusIcon, SparkleIcon } from './icons';
import { Button, Card, ErrorState, Heading, Input, Spinner, Text } from './ui';
import {
  AddSourceForm,
  SourceCard,
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

/**
 * Source Inbox: browse and search your sources — manually-added papers/links
 * plus live Obsidian vault notes (in API mode) — and send one to the Draft
 * Studio. A presentational shell; each concern lives in its own hook/component.
 */
export function SourceInbox({ onDraft }: SourceInboxProps) {
  const list = useSourceList();
  const vault = useVaultSearch();
  const ideas = useSourceIdeas();
  const deck = useSourceDeck();
  const [showForm, setShowForm] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [repurposeId, setRepurposeId] = useState<string | null>(null);

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

      {showForm && <AddSourceForm onAdd={list.addSource} onDone={() => setShowForm(false)} />}

      {list.loading ? (
        <Spinner />
      ) : list.error ? (
        <ErrorState title="Couldn't load sources" message={list.error} onRetry={() => list.reload(list.query)} />
      ) : list.sources.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No sources yet. Add a paper or note above, or set your Obsidian vault path in Settings to pull notes in.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="source-list">
          {list.sources.map((s) => (
            <SourceCard
              key={s.id}
              source={s}
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
                onRetry: () => ideas.toggle(s),
              }}
              deck={{
                open: deck.activeId === s.id,
                busy: deck.busy,
                error: deck.error,
                result: deck.deck,
                onToggle: () => deck.toggle(s),
                onRetry: () => deck.toggle(s),
                onDownload: () => deck.download(s.title),
              }}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
