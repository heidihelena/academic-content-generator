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
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/States';

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
      setError(err instanceof Error ? err.message : 'Failed to load sources.');
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
      setIdeasError(err instanceof Error ? err.message : 'Failed to generate ideas.');
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
      setDeckError(err instanceof Error ? err.message : 'Failed to build a carousel.');
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
      setError(err instanceof Error ? err.message : 'Failed to add the source.');
    }
  };

  return (
    <section aria-label="Source Inbox" className="card space-y-4 p-5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LinkIcon width={18} height={18} className="text-brand-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Source Inbox</h2>
            <p className="text-xs text-slate-500">
              Papers, notes and links — plus your Obsidian vault. Pick one to draft from.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary py-1.5 text-xs"
            onClick={() => setShowVault((v) => !v)}
            aria-expanded={showVault}
          >
            <SparkleIcon width={14} height={14} /> Search vault
          </button>
          <button
            className="btn-secondary py-1.5 text-xs"
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
          >
            <PlusIcon width={14} height={14} /> Add source
          </button>
        </div>
      </header>

      {showVault && (
        <div className="space-y-3 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Find vault passages by meaning, then draft straight from one.
            </p>
            <button
              type="button"
              className="btn-secondary py-1 text-[11px]"
              onClick={reindexVault}
              disabled={vaultBusy}
            >
              Re-index
            </button>
          </div>
          <form onSubmit={runVaultSearch} className="flex gap-2">
            <input
              aria-label="Search your vault"
              className="input"
              placeholder="e.g. tree canopy and heat…"
              value={vaultQuery}
              onChange={(e) => setVaultQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={vaultBusy || !vaultQuery.trim()}>
              Search
            </button>
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
                      <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] uppercase text-brand-400">
                        {Math.round(h.score * 100)}%
                      </span>
                      <span className="truncate text-sm font-medium text-slate-200">
                        {h.title || h.source}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{h.content}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-500">{h.source}</p>
                  </div>
                  <button
                    className="btn-primary shrink-0 py-1.5 text-xs"
                    onClick={() =>
                      onDraft({ title: h.title || h.source, material: h.content, sourceId: h.id })
                    }
                  >
                    Draft in Studio →
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <form onSubmit={submitSearch} className="flex gap-2">
        <input
          aria-label="Search sources"
          className="input"
          placeholder="Search your sources…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-secondary shrink-0">Search</button>
      </form>

      {showForm && (
        <form onSubmit={addSource} className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/40 p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="src-title" className="label">Title</label>
              <input
                id="src-title"
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="src-kind" className="label">Kind</label>
              <select
                id="src-kind"
                className="input"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as SourceKind })}
              >
                {SOURCE_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="src-url" className="label">Link / DOI (optional)</label>
            <input
              id="src-url"
              className="input"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="src-abstract" className="label">Abstract / notes (optional)</label>
            <textarea
              id="src-abstract"
              rows={3}
              className="input resize-none"
              value={form.abstract}
              onChange={(e) => setForm({ ...form, abstract: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary py-1.5 text-xs" disabled={!form.title.trim()}>
            Add to inbox
          </button>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState title="Couldn't load sources" message={error} onRetry={() => load(query)} />
      ) : sources.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No sources yet. Add one above, or point the app at a backend with an Obsidian vault.
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
                    <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                      {s.kind}
                    </span>
                    {isVaultSource(s) && (
                      <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] uppercase text-brand-400">
                        vault
                      </span>
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
                  <button
                    className="btn-primary py-1.5 text-xs"
                    onClick={() => setRepurposeSourceId((id) => (id === s.id ? null : s.id))}
                    aria-expanded={repurposeSourceId === s.id}
                  >
                    <SparkleIcon width={13} height={13} /> Repurpose
                  </button>
                  <button
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => onDraft({ title: s.title, material: sourceMaterial(s), sourceId: s.id })}
                  >
                    Draft in Studio →
                  </button>
                  <button
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => sparkIdeas(s)}
                    aria-expanded={ideasSourceId === s.id}
                  >
                    <SparkleIcon width={13} height={13} /> Spark ideas
                  </button>
                  <button
                    className="btn-secondary py-1.5 text-xs"
                    onClick={() => makeCarousel(s)}
                    aria-expanded={deckSourceId === s.id}
                  >
                    <LinkIcon width={13} height={13} /> Make carousel
                  </button>
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
                              <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                                {idea.channel}
                              </span>
                              <span className="truncate text-sm font-medium text-slate-200">{idea.angle}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{idea.hook}</p>
                          </div>
                          <button
                            className="btn-secondary shrink-0 py-1 text-xs"
                            onClick={() =>
                              onDraft({
                                title: idea.angle,
                                material: `${idea.hook}\n\n${sourceMaterial(s)}`,
                                sourceId: s.id,
                              })
                            }
                          >
                            Draft this →
                          </button>
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
                    <ErrorState title="Couldn't build a carousel" message={deckError} onRetry={() => makeCarousel(s)} />
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
                        <button className="btn-secondary py-1 text-xs" onClick={() => downloadDeck(s.title)}>
                          Download deck JSON
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
