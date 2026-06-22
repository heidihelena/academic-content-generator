import { useState } from 'react';
import type { Platform } from '../types';
import { THREAD_AUDIENCES, type ThreadAudience, type ThreadDraftResult } from '../ai/threadTypes';
import { draftThread } from '../ai/threadService';
import { PLATFORMS, getPlatformMeta } from '../lib/platforms';
import { useStore } from '../store/useStore';
import { PLATFORM_GLYPHS, BookIcon, PlusIcon } from './icons';
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/States';

/** Tomorrow at 09:00 local — a sensible default slot for a fresh draft thread. */
function tomorrowMorning(): string {
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}

/**
 * "Abstract → thread" drafter.
 *
 * Paste a paper abstract; the drafter restructures it into an accessible,
 * platform-sized thread (plain hook → key findings → why it matters → source).
 * The result can be dropped straight into the Drafting column as a thread.
 */
export function AbstractToThread() {
  const createThreadFromParts = useStore((s) => s.createThreadFromParts);

  const [abstract, setAbstract] = useState('');
  const [audience, setAudience] = useState<ThreadAudience>('general public');
  const [platform, setPlatform] = useState<Platform>('bluesky');
  const [sourceUrl, setSourceUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ThreadDraftResult | null>(null);
  const [added, setAdded] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setAdded(false);
    try {
      const res = await draftThread({ abstract, audience, platform, sourceUrl: sourceUrl || undefined });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft a thread.');
    } finally {
      setLoading(false);
    }
  };

  const addToCalendar = () => {
    if (!result) return;
    createThreadFromParts(result.parts, {
      platform,
      scheduledAt: tomorrowMorning(),
      status: 'draft',
      audience,
      source: sourceUrl ? { url: sourceUrl } : undefined,
    });
    setAdded(true);
  };

  const limit = getPlatformMeta(platform).characterLimit;

  return (
    <section aria-label="Abstract to thread" className="card space-y-4 p-4">
      <header className="flex items-center gap-2">
        <BookIcon width={18} height={18} className="text-brand-400" />
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Abstract → thread</h2>
          <p className="text-xs text-slate-500">
            Paste an abstract and get an accessible, platform-sized draft thread to edit.
          </p>
        </div>
      </header>

      <div>
        <label htmlFor="abstract" className="label">Abstract</label>
        <textarea
          id="abstract"
          rows={6}
          className="input resize-none"
          placeholder="Paste your paper abstract here…"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="thread-audience" className="label">Audience</label>
          <select
            id="thread-audience"
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value as ThreadAudience)}
          >
            {THREAD_AUDIENCES.map((a) => (
              <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="thread-source" className="label">Source link (optional)</label>
          <input
            id="thread-source"
            className="input"
            placeholder="https://doi.org/…"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>
      </div>

      <div>
        <span className="label">Platform</span>
        <div className="flex gap-1.5">
          {PLATFORMS.map((p) => {
            const Glyph = PLATFORM_GLYPHS[p];
            const active = platform === p;
            return (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                aria-pressed={active}
                className={`btn flex-1 py-2 ${active ? 'bg-surface-600' : 'bg-surface-800 hover:bg-surface-700'}`}
                style={active ? { color: getPlatformMeta(p).color } : undefined}
              >
                <Glyph width={16} height={16} />
                <span className="text-xs">{getPlatformMeta(p).name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button className="btn-primary w-full sm:w-auto" onClick={submit} disabled={loading}>
        {loading ? <Spinner size={16} label="Drafting" /> : <BookIcon width={16} height={16} />}
        {loading ? 'Drafting…' : 'Draft thread'}
      </button>

      {error && <ErrorState message={error} onRetry={submit} />}

      {result && !error && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {result.parts.length}-part thread for {getPlatformMeta(platform).name} · via {result.source}
            </p>
            <button className="btn-secondary py-1.5 text-xs" onClick={addToCalendar}>
              <PlusIcon width={14} height={14} /> Add to Drafting
            </button>
          </div>

          <ol data-testid="thread-preview" className="space-y-2">
            {result.parts.map((part, i) => (
              <li key={i} className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{part}</p>
                <span className="mt-1 block text-[10px] text-slate-500">{part.length}/{limit}</span>
              </li>
            ))}
          </ol>

          {added && (
            <p data-testid="thread-added" className="text-xs text-status-published">
              ✓ Added a {result.parts.length}-part thread to your Drafting column.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
