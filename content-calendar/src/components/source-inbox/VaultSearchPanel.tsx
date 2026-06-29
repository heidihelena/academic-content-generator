import type { StudioSeed } from '../../studio/studioTypes';
import type { VaultHit } from '../../vault/vaultClient';
import { Badge, Button, ErrorState, Input, Spinner, Text } from '../ui';

interface VaultSearchPanelProps {
  query: string;
  setQuery: (q: string) => void;
  hits: VaultHit[];
  searched: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onSearch: (e?: React.FormEvent) => void;
  onReindex: () => void;
  onDraft: (seed: StudioSeed) => void;
}

/** Semantic vault search: a query box, a re-index action, and ranked passages
 *  you can draft straight from. */
export function VaultSearchPanel({
  query,
  setQuery,
  hits,
  searched,
  busy,
  error,
  notice,
  onSearch,
  onReindex,
  onDraft,
}: VaultSearchPanelProps) {
  return (
    <div className="space-y-3 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <Text variant="secondary" className="text-xs text-slate-400">
          Find vault passages by meaning, then draft straight from one.
        </Text>
        <Button variant="secondary" size="sm" onClick={onReindex} disabled={busy}>
          Re-index
        </Button>
      </div>
      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          aria-label="Search your vault"
          placeholder="e.g. tree canopy and heat…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" className="shrink-0" disabled={busy || !query.trim()}>
          Search
        </Button>
      </form>
      {notice && <p className="text-[11px] text-brand-300">{notice}</p>}
      {busy ? (
        <Spinner />
      ) : error ? (
        <ErrorState title="Vault search failed" message={error} onRetry={() => onSearch()} />
      ) : searched && hits.length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-500">No matching passages.</p>
      ) : hits.length > 0 ? (
        <ul className="space-y-2" data-testid="vault-hits">
          {hits.map((h) => (
            <li
              key={h.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="brand" size="chip">
                    {Math.round(h.score * 100)}%
                  </Badge>
                  <span className="truncate text-sm font-medium text-slate-200">{h.title || h.source}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{h.content}</p>
                <p className="mt-1 truncate text-[11px] text-slate-500">{h.source}</p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => onDraft({ title: h.title || h.source, material: h.content, sourceId: h.id })}
              >
                Draft in Studio →
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
