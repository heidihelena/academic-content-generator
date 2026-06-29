import { useEffect, useState } from 'react';
import { createSource, listSources } from '../sources/sourcesClient';
import {
  SOURCE_KINDS,
  isVaultSource,
  sourceMaterial,
  type Source,
  type SourceKind,
} from '../sources/sourcesTypes';
import type { StudioSeed } from '../studio/studioTypes';
import { ingestVault, searchVault, type VaultHit } from '../vault/vaultClient';
import {
  generateIdeasFromSource,
  type AcademicIdea,
} from '../idea-lab/ideaLabClient';
import { generateCarousel, type CarouselResult } from '../carousel/carouselClient';
import { RepurposePanel } from './RepurposePanel';
import { LinkIcon, PlusIcon, SparkleIcon } from './icons';
import { Badge, Button, Card, ErrorState, Field, Heading, Input, Select, Spinner, Text, Textarea } from './ui';

interface SourceInboxProps {
  /** Send a source into the Draft Studio (pre-fills the Compose stage). */
  onDraft: (seed: StudioSeed) => void;
}

const EMPTY_FORM = { title: '', kind: 'paper' as SourceKind, url: '', abstract: '' };

/**
 * Source Inbox: browse and search your sources — manually-added papers/links
 * plus live Obsidian vault notes (in API mode) — and send one to the Draft
 * Studio to start writing.
 */
export function SourceInbox({ onDraft }: SourceInboxProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Semantic vault search — distinct from the source list: it ranks vault
  // *passages* by meaning (vector search in API mode, lexical fallback locally).
  const [showVault, setShowVault] = useState(false);
  const [vaultQuery, setVaultQuery] = useState('');
  const [vaultHits, setVaultHits] = useState<VaultHit[]>([]);
  const [vaultSearched, setVaultSearched] = useState(false);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultNotice, setVaultNotice] = useState<string | null>(null);

  // Idea Lab — 5 source-grounded ideas, expanded inline under the active source.
  const [ideasSourceId, setIdeasSourceId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<AcademicIdea[]>([]);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  // Carousel — a deck + safety review, expanded inline under the active source.
  const [deckSourceId, setDeckSourceId] = useState<string | null>(null);
  const [deck, setDeck] = useState<CarouselResult | null>(null);
  const [deckBusy, setDeckBusy] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);

  // Repurpose — fan one source out into all formats at once.
  const [repurposeSourceId, setRepurposeSourceId] = useState<string | null>(null);

  const load = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      setSources(await listSources(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load your sources — the local server may still be starting.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(query);
  };

  const runVaultSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = vaultQuery.trim();
    if (!q) return;
    setVaultBusy(true);
    setVaultError(null);
    setVaultNotice(null);
    try {
      setVaultHits(await searchVault(q));
      setVaultSearched(true);
    } catch (err) {
      setVaultError(err instanceof Error ? err.message : 'Vault search failed.');
    } finally {
      setVaultBusy(false);
    }
  };

  const reindexVault = async () => {
    setVaultBusy(true);
    setVaultError(null);
    setVaultNotice(null);
    try {
      const r = await ingestVault();
      setVaultNotice(
        r.files === 0
          ? 'No vault indexed (point the app at a backend with VAULT_PATH set).'
          : `Re-indexed ${r.files} file(s): ${r.embedded} embedded, ${r.skipped} unchanged.`,
      );
    } catch (err) {
      setVaultError(err instanceof Error ? err.message : 'Vault re-index failed.');
    } finally {
      setVaultBusy(false);
    }
  };

  const sparkIdeas = async (source: Source) => {
    // Toggle off if the same source's ideas are already open.
    if (ideasSourceId === source.id && !ideasBusy) {
      setIdeasSourceId(null);
      setIdeas([]);
      return;
    }
    setIdeasSourceId(source.id);
    setIdeas([]);
    setIdeasError(null);
    setIdeasBusy(true);
    try {
      const res = await generateIdeasFromSource({
        id: source.id,
        title: source.title,
        material: sourceMaterial(source),
      });
      setIdeas(res.ideas);
    } catch (err) {
      setIdeasError(err instanceof Error ? err.message : 'Idea generation didn’t finish. It runs locally — try again.');
    } finally {
      setIdeasBusy(false);
    }
  };

  const makeCarousel = async (source: Source) => {
    if (deckSourceId === source.id && !deckBusy) {
      setDeckSourceId(null);
      setDeck(null);
      return;
    }
    setDeckSourceId(source.id);
    setDeck(null);
    setDeckError(null);
    setDeckBusy(true);
    try {
      setDeck(
        await generateCarousel({
          id: source.id,
          title: source.title,
          material: sourceMaterial(source),
        }),
      );
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : 'Couldn’t build the slide deck. Try again.');
    } finally {
      setDeckBusy(false);
    }
  };

  const downloadDeck = (title: string) => {
    if (!deck) return;
    const blob = new Blob([JSON.stringify(deck.deck, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `${title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'deck'}.json`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await createSource({
        kind: form.kind,
        title: form.title,
        url: form.url || undefined,
        abstract: form.abstract || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setQuery('');
      await load('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add that source. Check the title and try again.');
    }
  };

  return (
    <Card as="section" aria-label="Source Inbox" className="space-y-4 p-5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LinkIcon width={18} height={18} className="text-brand-400" />
          <div>
            <Heading>Source Inbox</Heading>
            <Text variant="muted">
              Papers, notes and links — plus your Obsidian vault. Pick one to draft from.
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowVault((v) => !v)}
            aria-expanded={showVault}
          >
            <SparkleIcon width={14} height={14} /> Search vault
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
          >
            <PlusIcon width={14} height={14} /> Add source
          </Button>
        </div>
      </header>

      {showVault && (
        <div className="space-y-3 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <Text variant="secondary" className="text-xs text-slate-400">
              Find vault passages by meaning, then draft straight from one.
            </Text>
            <Button
              variant="secondary"
              size="sm"
              onClick={reindexVault}
              disabled={vaultBusy}
            >
              Re-index
            </Button>
          </div>
          <form onSubmit={runVaultSearch} className="flex gap-2">
            <Input
              aria-label="Search your vault"
              placeholder="e.g. tree canopy and heat…"
              value={vaultQuery}
              onChange={(e) => setVaultQuery(e.target.value)}
            />
            <Button type="submit" className="shrink-0" disabled={vaultBusy || !vaultQuery.trim()}>
              Search
            </Button>
          </form>
          {vaultNotice && <p className="text-[11px] text-brand-300">{vaultNotice}</p>}
          {vaultBusy ? (
            <Spinner />
          ) : vaultError ? (
            <ErrorState title="Vault search failed" message={vaultError} onRetry={() => void runVaultSearch()} />
          ) : vaultSearched && vaultHits.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-500">No matching passages.</p>
          ) : vaultHits.length > 0 ? (
            <ul className="space-y-2" data-testid="vault-hits">
              {vaultHits.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand" size="chip">
                        {Math.round(h.score * 100)}%
                      </Badge>
                      <span className="truncate text-sm font-medium text-slate-200">
                        {h.title || h.source}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{h.content}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-500">{h.source}</p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() =>
                      onDraft({ title: h.title || h.source, material: h.content, sourceId: h.id })
                    }
                  >
                    Draft in Studio →
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <form onSubmit={submitSearch} className="flex gap-2">
        <Input
          aria-label="Search sources"
          placeholder="Search your sources…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="shrink-0">Search</Button>
      </form>

      {showForm && (
        <form onSubmit={addSource} className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/40 p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Title" htmlFor="src-title">
              <Input
                id="src-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Kind" htmlFor="src-kind">
              <Select
                id="src-kind"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as SourceKind })}
              >
                {SOURCE_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Link / DOI (optional)" htmlFor="src-url">
            <Input
              id="src-url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </Field>
          <Field label="Abstract / notes (optional)" htmlFor="src-abstract">
            <Textarea
              id="src-abstract"
              rows={3}
              value={form.abstract}
              onChange={(e) => setForm({ ...form, abstract: e.target.value })}
            />
          </Field>
          <Button type="submit" size="sm" disabled={!form.title.trim()}>
            Add to inbox
          </Button>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState title="Couldn't load sources" message={error} onRetry={() => load(query)} />
      ) : sources.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No sources yet. Add a paper or note above, or set your Obsidian vault path in Settings to pull notes in.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="source-list">
          {sources.map((s) => (
            <li
              key={s.id}
              className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge size="chip">{s.kind}</Badge>
                    {isVaultSource(s) && (
                      <Badge tone="brand" size="chip">vault</Badge>
                    )}
                    <span className="truncate text-sm font-medium text-slate-200">{s.title}</span>
                  </div>
                  {(s.abstract || s.body) && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{s.abstract || s.body}</p>
                  )}
                  {s.tags.length > 0 && (
                    <p className="mt-1 text-[11px] text-slate-500">{s.tags.map((t) => `#${t}`).join(' ')}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => setRepurposeSourceId((id) => (id === s.id ? null : s.id))}
                    aria-expanded={repurposeSourceId === s.id}
                  >
                    <SparkleIcon width={13} height={13} /> Turn into posts
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onDraft({ title: s.title, material: sourceMaterial(s), sourceId: s.id })}
                  >
                    Draft in Studio →
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => sparkIdeas(s)}
                    aria-expanded={ideasSourceId === s.id}
                  >
                    <SparkleIcon width={13} height={13} /> Suggest angles
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => makeCarousel(s)}
                    aria-expanded={deckSourceId === s.id}
                  >
                    <LinkIcon width={13} height={13} /> Build slide deck
                  </Button>
                </div>
              </div>

              {repurposeSourceId === s.id && <RepurposePanel source={s} onDraft={onDraft} />}

              {ideasSourceId === s.id && (
                <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
                  {ideasBusy ? (
                    <Spinner />
                  ) : ideasError ? (
                    <ErrorState title="Couldn't generate ideas" message={ideasError} onRetry={() => sparkIdeas(s)} />
                  ) : (
                    <ul className="space-y-2" data-testid="idea-list">
                      {ideas.map((idea) => (
                        <li
                          key={idea.id}
                          className="flex items-start justify-between gap-3 rounded-md border border-surface-700 bg-surface-800/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge size="chip">{idea.channel}</Badge>
                              <span className="truncate text-sm font-medium text-slate-200">{idea.angle}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{idea.hook}</p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="shrink-0"
                            onClick={() =>
                              onDraft({
                                title: idea.angle,
                                material: `${idea.hook}\n\n${sourceMaterial(s)}`,
                                sourceId: s.id,
                              })
                            }
                          >
                            Draft this →
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {deckSourceId === s.id && (
                <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
                  {deckBusy ? (
                    <Spinner />
                  ) : deckError ? (
                    <ErrorState title="Couldn’t build the slide deck" message={deckError} onRetry={() => makeCarousel(s)} />
                  ) : deck ? (
                    <div className="space-y-3" data-testid="carousel-deck">
                      <div
                        className={`rounded-md px-3 py-2 text-xs ${
                          deck.review.cleared
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        {deck.review.cleared
                          ? '✓ Safety review cleared — no blocking findings in the slide text.'
                          : `⚠ Safety review blocked: ${deck.review.findings
                              .filter((f) => f.severity === 'block')
                              .map((f) => f.message)
                              .join('; ')}`}
                      </div>
                      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="deck-slides">
                        {deck.deck.slides.map((slide, i) => (
                          <li
                            key={i}
                            className="rounded-md border border-surface-700 bg-surface-800/60 p-2"
                          >
                            <span className="text-[10px] uppercase text-brand-400">
                              {slide.kicker || slide.type}
                            </span>
                            <p className="mt-0.5 line-clamp-3 text-xs font-medium text-slate-200">{slide.title}</p>
                          </li>
                        ))}
                      </ol>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500">{deck.deck.slides.length} slides · {deck.deck.theme}</p>
                        <Button variant="secondary" size="sm" onClick={() => downloadDeck(s.title)}>
                          Download deck JSON
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
