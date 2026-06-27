import { useEffect, useState } from 'react';
import type { ConnectionsReport, ProviderStatus, SocialStatus } from '../lib/api';
import { fetchConnectionsState, type ConnectionsState } from '../lib/connections';
import { ConnectedAccounts } from './ConnectedAccounts';
import { ErrorState, LoadingState } from './ui/States';
import { BookIcon, PlugIcon, SparkleIcon } from './icons';

/**
 * macOS iCloud path hints for a local run. Academics keep their Obsidian vault
 * (the input) and the SQLite content store in iCloud so both Macs stay in sync.
 * `~` expands to your home folder; replace `<Vault>` with your vault's name.
 */
const MAC_PATHS = {
  vault: '~/Library/Mobile Documents/iCloud~md~obsidian/Documents/<Vault>',
  sqlite: '~/Library/Mobile Documents/com~apple~CloudDocs/forskai/content.sqlite',
} as const;

const PROVIDER_LABELS: Array<{ key: keyof ConnectionsReport['providers']; label: string; hint: string }> = [
  { key: 'llm', label: 'Text (LLM)', hint: 'Ideas & drafts — Claude, Ollama, or local mock' },
  { key: 'voice', label: 'Voice', hint: 'Narration — ElevenLabs or local mock' },
  { key: 'video', label: 'Video', hint: 'Avatar shorts — HeyGen or local mock' },
  { key: 'embeddings', label: 'Embeddings', hint: 'Semantic search — Voyage or local mock' },
];

/**
 * Connections panel: how this local Mac run is wired up. Three sections —
 * Inputs & storage (iCloud paths), Content generators (live vs mock), and
 * Publishing destinations (the interactive connect flow). Reads the secret-safe
 * `GET /api/connections` report in API mode; shows the all-mock default offline.
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

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!state) return <LoadingState label="Loading connections…" />;

  const { report, mode, online } = state;

  return (
    <div className="space-y-4">
      {mode === 'api' && !online && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Backend unreachable — showing local defaults. Start the server or check
          <code className="mx-1">VITE_API_URL</code>.
        </p>
      )}

      <InputsCard inputs={report.inputs} />

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
            <ProviderRow key={key} label={label} hint={hint} status={report.providers[key]} />
          ))}
        </div>
      </section>

      <section aria-label="Publishing destinations" className="card space-y-3 p-4">
        <header className="flex items-center gap-2">
          <PlugIcon width={16} height={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-200">Publishing destinations</h2>
        </header>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {report.social.map((s) => (
            <SocialRow key={s.platform} status={s} />
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Connect an account below to verify and store its credentials. Bluesky is the
          quickest — create an app password under Settings → App Passwords.
        </p>
        <ConnectedAccounts />
      </section>
    </div>
  );
}

function InputsCard({ inputs }: { inputs: ConnectionsReport['inputs'] }) {
  const sqlite = inputs.persistenceDriver === 'sqlite';
  return (
    <section aria-label="Inputs and storage" className="card space-y-3 p-4">
      <header className="flex items-center gap-2">
        <BookIcon width={16} height={16} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-slate-200">Inputs &amp; storage</h2>
      </header>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <Field label="Obsidian vault" value={inputs.vaultPath} />
        <Field label="Persistence" value={inputs.persistenceDriver} />
        <Field label="SQLite path" value={inputs.sqlitePath || '—'} span />
      </dl>
      <div className="space-y-1.5 rounded-lg border border-surface-700 bg-surface-850 p-3 text-[11px] text-slate-400">
        <p className="font-medium text-slate-300">Running locally on a Mac?</p>
        <p>
          Point <code>VAULT_PATH</code> at your iCloud Obsidian vault:
        </p>
        <code className="block break-all text-slate-300">{MAC_PATHS.vault}</code>
        <p>
          And keep the SQLite content store in iCloud Drive (set
          <code className="mx-1">PERSISTENCE_DRIVER=sqlite</code> and
          <code className="mx-1">SQLITE_PATH</code>):
        </p>
        <code className="block break-all text-slate-300">{MAC_PATHS.sqlite}</code>
        {sqlite && (
          <p className="text-amber-400">
            ⚠︎ SQLite in iCloud can corrupt if two Macs open it at once — keep forskai
            running on one Mac at a time.
          </p>
        )}
      </div>
    </section>
  );
}

function Field({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-all font-mono text-slate-300">{value}</dd>
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
