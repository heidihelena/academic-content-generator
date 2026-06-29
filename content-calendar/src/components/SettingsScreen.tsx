import { useEffect, useState } from 'react';
import type { ConnectionsReport, LocalSettings } from '../lib/api';
import { fetchConnectionsState } from '../lib/connections';
import { fetchSettings, saveSettings } from '../lib/settings';
import { ErrorState, LoadingState } from './ui/States';
import { Spinner } from './ui/Spinner';
import { BookIcon, CheckIcon } from './icons';

/**
 * macOS path hints for a local run. The Obsidian vault (the input) lives in
 * iCloud so it syncs across Macs; the SQLite content store is kept **local**
 * (not iCloud) to avoid corruption when two Macs open it at once.
 */
const MAC_PATHS = {
  vault: '~/Library/Mobile Documents/iCloud~md~obsidian/Documents/<Vault>',
  sqlite: '~/forskai/content.sqlite',
} as const;

const PERSISTENCE_DRIVERS = ['memory', 'file', 'sqlite', 'neon'] as const;

/**
 * Settings — local inputs & storage (the Obsidian vault path, persistence
 * driver, SQLite path). Split out of Connections so "where my content comes
 * from / lives" is separate from "which accounts + services are wired up".
 * Reads the secret-safe connections report for the effective boot values;
 * editable in API mode (persists to `~/forskai/settings.json`).
 */
export function SettingsScreen() {
  const [inputs, setInputs] = useState<ConnectionsReport['inputs'] | null>(null);
  const [editable, setEditable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    setInputs(null);
    fetchConnectionsState()
      .then((s) => {
        setInputs(s.report.inputs);
        setEditable(s.mode === 'api' && s.online);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load settings.'));
  };

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!inputs) return <LoadingState label="Loading settings…" />;
  return <SettingsCard inputs={inputs} editable={editable} />;
}

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
