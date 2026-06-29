import { useEffect, useState } from 'react';
import type { ConnectionsReport, LocalSettings, ProviderStatus, SocialStatus } from '../lib/api';
import { fetchConnectionsState, type ConnectionsState } from '../lib/connections';
import { fetchSettings, saveSettings } from '../lib/settings';
import { ConnectedAccounts } from './ConnectedAccounts';
import { ErrorState, LoadingState } from './ui/States';
import { Spinner } from './ui/Spinner';
import { BookIcon, CheckIcon, PlugIcon, SparkleIcon } from './icons';

/**
 * macOS path hints for a local run. The Obsidian vault (the input) lives in
 * iCloud so it syncs across Macs; the SQLite content store is kept **local**
 * (not iCloud) to avoid corruption when two Macs open it at once. `~` expands to
 * your home folder; replace `<Vault>` with your vault's name.
 */
const MAC_PATHS = {
  vault: '~/Library/Mobile Documents/iCloud~md~obsidian/Documents/<Vault>',
  sqlite: '~/forskai/content.sqlite',
} as const;

const PERSISTENCE_DRIVERS = ['memory', 'file', 'sqlite', 'neon'] as const;

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
              Backend unreachable — showing local defaults. Start the server or check
              <code className="mx-1">VITE_API_URL</code>.
            </p>
          )}

          <SettingsCard inputs={state.report.inputs} editable={state.mode === 'api' && state.online} />

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

/**
 * Inputs & storage — editable in API mode. Loads the saved local settings and
 * saves them back via `PUT /api/settings` (the writable `~/forskai/settings.json`
 * store), so the local-Mac paths are set here, not by hand-editing `.env`. The
 * effective boot value is shown as each field's placeholder. Read-only in local
 * mode (no backend to persist to).
 */
function SettingsCard({
  inputs,
  editable,
}: {
  inputs: ConnectionsReport['inputs'];
  editable: boolean;
}) {
  const [form, setForm] = useState<LocalSettings>({});
  const [loading, setLoading] = useState(editable);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editable) return;
    fetchSettings()
      .then(setForm)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [editable]);

  const set = (patch: LocalSettings) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      setForm(await saveSettings(form));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Inputs and storage" className="card space-y-3 p-4">
      <header className="flex items-center gap-2">
        <BookIcon width={16} height={16} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-slate-200">Inputs &amp; storage</h2>
      </header>

      {loading ? (
        <LoadingState label="Loading settings…" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Obsidian vault path"
            value={form.vaultPath ?? ''}
            placeholder={inputs.vaultPath}
            disabled={!editable}
            onChange={(v) => set({ vaultPath: v })}
            span
          />
          <SelectField
            label="Persistence driver"
            value={form.persistenceDriver ?? inputs.persistenceDriver}
            options={PERSISTENCE_DRIVERS}
            disabled={!editable}
            onChange={(v) => set({ persistenceDriver: v })}
          />
          <TextField
            label="SQLite path"
            value={form.sqlitePath ?? ''}
            placeholder={inputs.sqlitePath || MAC_PATHS.sqlite}
            disabled={!editable}
            onChange={(v) => set({ sqlitePath: v })}
          />
        </div>
      )}

      {editable ? (
        <div className="flex items-center gap-3">
          <button className="btn-primary py-1.5 text-xs" onClick={onSave} disabled={saving}>
            {saving ? <Spinner size={14} label="Saving" /> : <CheckIcon width={14} height={14} />}
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && (
            <span className="text-[11px] text-emerald-400" role="status">
              Saved — restart the server to apply.
            </span>
          )}
          {error && <span className="text-[11px] text-status-failed">{error}</span>}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          Read-only in local mode — set <code>VITE_API_URL</code> to edit and save these paths.
        </p>
      )}

      <div className="space-y-1.5 rounded-lg border border-surface-700 bg-surface-850 p-3 text-[11px] text-slate-400">
        <p className="font-medium text-slate-300">Running locally on a Mac?</p>
        <p>Point the vault at your iCloud Obsidian vault (it syncs across Macs):</p>
        <code className="block break-all text-slate-300">{MAC_PATHS.vault}</code>
        <p>
          Keep the SQLite store <strong>local</strong> (set the driver to
          <code className="mx-1">sqlite</code>) — not in iCloud, so two Macs can't corrupt it:
        </p>
        <code className="block break-all text-slate-300">{MAC_PATHS.sqlite}</code>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  disabled,
  onChange,
  span,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  span?: boolean;
}) {
  return (
    <label className={span ? 'sm:col-span-2' : undefined}>
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <input
        className="input mt-1 font-mono text-xs"
        type="text"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <select
        className="input mt-1 text-xs"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
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
