import { useEffect, useState } from 'react';
import { contentClient } from '../content/contentClient';
import type { ContentVariant, PublishLogEntry } from '../content/contentTypes';
import { CheckIcon } from './icons';
import { Spinner } from './ui/Spinner';

/**
 * Manual-publish assistant: copy the reviewed text out, post it by hand, then
 * record where it went live (writes to the backend PublishLog via the content
 * client). Shown once a variant is exported — the point at which you publish.
 */
export function PublishAssistant({ variant }: { variant: ContentVariant }) {
  const [logs, setLogs] = useState<PublishLogEntry[]>([]);
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    contentClient
      .listPublishLog(variant.id)
      .then((l) => active && setLogs(l))
      .catch(() => active && setLogs([]));
    return () => {
      active = false;
    };
  }, [variant.id]);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context) — non-fatal
    }
  };

  const record = async () => {
    setBusy(true);
    setError(null);
    try {
      const entry = await contentClient.recordPublish(variant.id, {
        publishedUrl: url || undefined,
        notes: notes || undefined,
      });
      setLogs((prev) => [entry, ...prev]);
      setUrl('');
      setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record publish.');
    } finally {
      setBusy(false);
    }
  };

  const fullText = [variant.hook, variant.body, variant.hashtags.map((h) => `#${h}`).join(' ')]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className="space-y-3 border-t border-surface-700 pt-4" data-testid="publish-assistant">
      <p className="text-xs font-semibold text-slate-300">Publish assistant</p>

      <div className="flex flex-wrap gap-1.5">
        <CopyButton label="Copy post" active={copied === 'post'} onClick={() => copy('post', fullText)} />
        {variant.hook && (
          <CopyButton label="Copy hook" active={copied === 'hook'} onClick={() => copy('hook', variant.hook as string)} />
        )}
        <CopyButton label="Copy body" active={copied === 'body'} onClick={() => copy('body', variant.body)} />
      </div>

      <div className="space-y-1.5">
        <input
          className="input w-full text-xs"
          placeholder="Published URL (optional)"
          aria-label="Published URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="input w-full text-xs"
          placeholder="Notes (optional)"
          aria-label="Publish notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="btn-secondary py-1 text-xs" disabled={busy} onClick={record}>
          {busy ? <Spinner size={12} label="Recording" /> : null} Mark published
        </button>
      </div>

      {error && <p className="text-xs text-status-overdue">{error}</p>}

      {logs.length > 0 && (
        <ul className="space-y-1" data-testid="publish-log">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <CheckIcon width={11} height={11} />
              <span>{new Date(l.publishedAt).toLocaleDateString()}</span>
              {l.publishedUrl && (
                <a className="truncate text-sky-400 hover:underline" href={l.publishedUrl} target="_blank" rel="noreferrer">
                  {l.publishedUrl}
                </a>
              )}
              {l.notes && <span className="truncate text-slate-500">— {l.notes}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className="btn-secondary py-1 text-xs" onClick={onClick}>
      {active ? <><CheckIcon width={12} height={12} /> Copied</> : label}
    </button>
  );
}
