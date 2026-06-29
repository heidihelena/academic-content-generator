import { useEffect, useState } from 'react';
import type { ConnectionsReport, ProviderStatus, SocialStatus } from '../lib/api';
import { fetchConnectionsState, type ConnectionsState } from '../lib/connections';
import { ConnectedAccounts } from './ConnectedAccounts';
import { ErrorState, LoadingState } from './ui/States';
import { PlugIcon, SparkleIcon } from './icons';

const PROVIDER_LABELS: Array<{ key: keyof ConnectionsReport['providers']; label: string; hint: string }> = [
  { key: 'llm', label: 'Text (LLM)', hint: 'Ideas & drafts — Claude, Ollama, or local mock' },
  { key: 'voice', label: 'Voice', hint: 'Narration — ElevenLabs or local mock' },
  { key: 'video', label: 'Video', hint: 'Avatar shorts — HeyGen or local mock' },
  { key: 'embeddings', label: 'Embeddings', hint: 'Semantic search — Voyage or local mock' },
];

/**
 * Connections panel: how this run is wired up — connected accounts (the
 * interactive connect flow), content generators (live vs mock), and the
 * destination-credential status. Reads the secret-safe `GET /api/connections`
 * report in API mode; shows the all-mock default offline. Local inputs/storage
 * paths live on the separate Settings screen.
 */
export function ConnectionsView() {
  const [state, setState] = useState<ConnectionsState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    setState(null);
    fetchConnectionsState()
      .then(setState)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load connections.'));
  };

  useEffect(load, []);

  return (
    <div className="space-y-4">
      {/* Connect accounts — always available; this is the interactive flow and
          doesn't depend on the (async) secret-safe status snapshot below. It is
          the single home for accounts now that the separate nav item was merged. */}
      <ConnectedAccounts />

      {/* Secret-safe status snapshot + local settings (loads from the backend). */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !state ? (
        <LoadingState label="Loading connection status…" />
      ) : (
        <>
          {state.mode === 'api' && !state.online && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              Working offline — the local server isn't running. Your data is safe;
              reconnect to publish and sync.
            </p>
          )}

          <section aria-label="Content generators" className="card space-y-3 p-4">
            <header className="flex items-center gap-2">
              <SparkleIcon width={16} height={16} className="text-brand-400" />
              <h2 className="text-sm font-semibold text-slate-200">Content generators</h2>
            </header>
            <p className="text-xs text-slate-500">
              Everything works offline with a deterministic mock. Add an API key in your
              <code className="mx-1">.env</code> to switch a generator to live — no code change.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROVIDER_LABELS.map(({ key, label, hint }) => (
                <ProviderRow key={key} label={label} hint={hint} status={state.report.providers[key]} />
              ))}
            </div>
          </section>

          <section aria-label="Publishing destinations" className="card space-y-3 p-4">
            <header className="flex items-center gap-2">
              <PlugIcon width={16} height={16} className="text-brand-400" />
              <h2 className="text-sm font-semibold text-slate-200">Publishing destinations</h2>
            </header>
            <p className="text-xs text-slate-500">
              Status of each destination's credentials (configure live posting in your
              <code className="mx-1">.env</code>; connect accounts above).
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {state.report.social.map((s) => (
                <SocialRow key={s.platform} status={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ProviderRow({ label, hint, status }: { label: string; hint: string; status: ProviderStatus }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-surface-700 bg-surface-850 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-[11px] text-slate-500">{hint}</p>
      </div>
      <StatusPill live={status.live} active={status.active} />
    </div>
  );
}

function SocialRow({ status }: { status: SocialStatus }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-surface-700 bg-surface-850 px-3 py-2 text-xs">
      <span className="capitalize text-slate-300">{status.platform}</span>
      <span className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-slate-600">{status.method}</span>
        <Dot ok={status.configured} okLabel="Configured" offLabel="Not connected" />
      </span>
    </div>
  );
}

function StatusPill({ live, active }: { live: boolean; active: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${
        live ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-800 text-slate-400'
      }`}
      title={live ? `Live · ${active}` : `Mock (${active})`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-slate-500'}`} />
      {live ? active : 'mock'}
    </span>
  );
}

function Dot({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-slate-500'}`} />
      {ok ? okLabel : offLabel}
    </span>
  );
}
