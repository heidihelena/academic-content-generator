import { useState } from 'react';
import {
  TALK_AUDIENCES,
  type TalkAudience,
  type TalkPackage,
} from '../ai/talkPackageTypes';
import { exportTalkPackage, generateTalkPackage } from '../ai/talkPackageService';
import { SparkleIcon, BookIcon, VideoIcon, CheckIcon, AlertIcon } from './icons';
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/States';

const DURATIONS = [
  { min: 5, label: '5 min — lightning' },
  { min: 12, label: '12 min — conference talk' },
  { min: 20, label: '20 min — seminar' },
];

/**
 * The magic button: paste an abstract and one click produces the whole arc —
 * a long-form talk plus one short per point, with a safety review and (in API
 * mode) a persisted campaign you can export to the Obsidian vault.
 */
export function TalkPackageStudio() {
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [audience, setAudience] = useState<TalkAudience>('peers');
  const [durationMin, setDurationMin] = useState(12);
  const [url, setUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TalkPackage | null>(null);
  const [exported, setExported] = useState<string[] | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setExported(null);
    setExportError(null);
    try {
      setResult(await generateTalkPackage({ title, abstract, audience, durationMin, url: url || undefined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the package.');
    } finally {
      setLoading(false);
    }
  };

  const exportVault = async () => {
    if (!result) return;
    setExportError(null);
    try {
      setExported((await exportTalkPackage(result)).paths);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  return (
    <section aria-label="Talk package" className="card space-y-4 p-4">
      <header className="flex items-center gap-2">
        <SparkleIcon width={18} height={18} className="text-brand-400" />
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Abstract → talk + shorts</h2>
          <p className="text-xs text-slate-500">
            One click: a long-form talk and a short per point, safety-reviewed, ready to schedule.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tp-title" className="label">Title</label>
          <input
            id="tp-title"
            className="input"
            placeholder="Street trees and urban heat"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="tp-url" className="label">Link (optional)</label>
          <input
            id="tp-url"
            className="input"
            placeholder="https://doi.org/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="tp-abstract" className="label">Paper abstract</label>
        <textarea
          id="tp-abstract"
          rows={5}
          className="input resize-none"
          placeholder="Paste your paper abstract here…"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tp-audience" className="label">Audience</label>
          <select
            id="tp-audience"
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value as TalkAudience)}
          >
            {TALK_AUDIENCES.map((a) => (
              <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tp-duration" className="label">Talk length</label>
          <select
            id="tp-duration"
            className="input"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d.min} value={d.min}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn-primary w-full sm:w-auto" onClick={generate} disabled={loading}>
        {loading ? <Spinner size={16} label="Generating" /> : <SparkleIcon width={16} height={16} />}
        {loading ? 'Generating…' : 'Generate talk + shorts'}
      </button>

      {error && <ErrorState message={error} onRetry={generate} />}

      {result && !error && (
        <div data-testid="talk-package-result" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">
              ~{result.estimatedMinutes} min talk · {result.shorts.length} short
              {result.shorts.length === 1 ? '' : 's'} · via {result.source}
            </span>
            <ReviewBadge cleared={result.review.cleared} count={result.review.findings.length} />
          </div>

          {result.prior.length > 0 && (
            <p data-testid="talk-prior" className="text-xs text-amber-400/90">
              Reuse: {result.prior.length} piece{result.prior.length === 1 ? '' : 's'} already made from this source — the talk avoids repeating them.
            </p>
          )}

          {!result.review.cleared && (
            <ul className="space-y-1">
              {result.review.findings.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-status-overdue">
                  <AlertIcon width={13} height={13} className="mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          )}

          <details className="rounded-lg border border-surface-700 bg-surface-800/60">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-300">
              <BookIcon width={14} height={14} className="mr-1 inline" /> Talk script
            </summary>
            <pre
              data-testid="talk-body"
              className="overflow-x-auto whitespace-pre-wrap px-3 pb-3 text-xs leading-relaxed text-slate-300"
            >
              {result.talk.body}
            </pre>
          </details>

          <ol className="space-y-2">
            {result.shorts.map((short, i) => (
              <li
                key={i}
                data-testid="short-item"
                className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2"
              >
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                  <VideoIcon width={12} height={12} /> Short {i + 1}
                </p>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{short.body}</pre>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary py-1.5 text-xs" onClick={exportVault}>
              <BookIcon width={14} height={14} /> Export to vault
            </button>
            {exported && (
              <span data-testid="export-done" className="text-xs text-status-published">
                ✓ Wrote {exported.length} note{exported.length === 1 ? '' : 's'} to the vault.
              </span>
            )}
            {exportError && <span className="text-xs text-status-overdue">{exportError}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewBadge({ cleared, count }: { cleared: boolean; count: number }) {
  return cleared ? (
    <span
      data-testid="review-badge"
      className="inline-flex items-center gap-1 rounded-full bg-status-published/15 px-2 py-0.5 text-[11px] font-semibold text-status-published"
    >
      <CheckIcon width={12} height={12} /> Safety: cleared
    </span>
  ) : (
    <span
      data-testid="review-badge"
      className="inline-flex items-center gap-1 rounded-full bg-status-overdue/15 px-2 py-0.5 text-[11px] font-semibold text-status-overdue"
    >
      <AlertIcon width={12} height={12} /> {count} safety finding{count === 1 ? '' : 's'}
    </span>
  );
}
