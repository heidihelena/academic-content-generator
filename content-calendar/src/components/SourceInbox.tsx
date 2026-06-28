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
              className="flex items-start justify-between gap-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5"
            >
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
              <button
                className="btn-primary shrink-0 py-1.5 text-xs"
                onClick={() => onDraft({ title: s.title, material: sourceMaterial(s), sourceId: s.id })}
              >
                Draft in Studio →
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
