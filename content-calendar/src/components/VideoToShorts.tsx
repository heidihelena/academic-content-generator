import { useState } from 'react';
import { THREAD_AUDIENCES, type ThreadAudience } from '../ai/threadTypes';
import type { ShortsPlanResult } from '../ai/shortsTypes';
import { planShortsFromVideo } from '../ai/shortsService';
import { buildClipRecipe } from '../lib/clipRecipe';
import { fetchTranscript } from '../lib/transcript';
import { getPlatformMeta } from '../lib/platforms';
import { useStore } from '../store/useStore';
import { VideoIcon, PlusIcon } from './icons';
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/States';

const COUNTS = [3, 4, 5, 6];

/** Collapsible copy-paste recipe (yt-dlp + ffmpeg) to render one vertical clip. */
function ClipRecipeBlock(props: { startSeconds: number; endSeconds: number; index: number; videoUrl?: string }) {
  const [open, setOpen] = useState(false);
  const recipe = buildClipRecipe(props);
  const commands = [recipe.download, recipe.render].filter(Boolean).join('\n');

  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-[11px] text-brand-400 hover:underline"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '▾' : '▸'} Render recipe ({recipe.durationSeconds}s vertical clip)
      </button>
      {open && (
        <div data-testid="clip-recipe" className="mt-1 space-y-1.5">
          {!props.videoUrl && (
            <p className="text-[10px] text-slate-500">Add the video URL above to include the download step.</p>
          )}
          <pre className="overflow-x-auto rounded bg-surface-950 p-2 text-[10px] leading-relaxed text-slate-300">
            {commands}
          </pre>
          <button
            type="button"
            className="btn-ghost py-1 text-[11px]"
            onClick={() => navigator.clipboard?.writeText(commands)}
          >
            Copy commands
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * "Video → Shorts plan" — paste a long-form transcript (ideally with the
 * timestamps YouTube provides) and get a plan of short clips: each with a
 * suggested cut range, title, hook and caption. "Add to Drafting" drops them on
 * the board as YouTube posts (deep-linked to each moment when a URL is given).
 */
export function VideoToShorts() {
  const createShortDrafts = useStore((s) => s.createShortDrafts);

  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [count, setCount] = useState(4);
  const [audience, setAudience] = useState<ThreadAudience>('general public');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortsPlanResult | null>(null);
  const [added, setAdded] = useState(false);

  // Transcript fetch (verify-or-redo): pull captions from the URL, confirm we
  // got them, and only then proceed — otherwise the user pastes manually.
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchOk, setFetchOk] = useState<number | null>(null);

  const onFetch = async () => {
    if (!videoUrl.trim()) return;
    setFetching(true);
    setFetchError(null);
    setFetchOk(null);
    try {
      const res = await fetchTranscript(videoUrl.trim());
      setTranscript(res.transcript);
      setFetchOk(res.cueCount); // verified: N captions
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Could not fetch transcript.');
    } finally {
      setFetching(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    setAdded(false);
    try {
      const res = await planShortsFromVideo({
        transcript,
        videoUrl: videoUrl || undefined,
        count,
        audience,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plan shorts.');
    } finally {
      setLoading(false);
    }
  };

  const addToCalendar = () => {
    if (!result) return;
    createShortDrafts(
      result.shorts.map((s) => ({ hook: s.hook, caption: s.caption, startSeconds: s.startSeconds })),
      { platform: 'youtube', audience, videoUrl: videoUrl || undefined },
    );
    setAdded(true);
  };

  const limit = getPlatformMeta('youtube').characterLimit;

  return (
    <section aria-label="Video to shorts" className="card space-y-4 p-4">
      <header className="flex items-center gap-2">
        <VideoIcon width={18} height={18} className="text-brand-400" />
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Video → Shorts plan</h2>
          <p className="text-xs text-slate-500">
            Paste a long-form transcript and get a plan of short clips with cut points.
          </p>
        </div>
      </header>

      <div>
        <label htmlFor="video-url" className="label">YouTube URL (optional)</label>
        <div className="flex gap-2">
          <input
            id="video-url"
            className="input"
            placeholder="https://www.youtube.com/watch?v=…"
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              setFetchOk(null);
              setFetchError(null);
            }}
          />
          <button
            type="button"
            className="btn-secondary shrink-0 py-1.5 text-xs"
            disabled={!videoUrl.trim() || fetching}
            onClick={onFetch}
          >
            {fetching ? <Spinner size={14} label="Fetching" /> : <VideoIcon width={14} height={14} />}
            {fetching ? 'Fetching…' : 'Fetch transcript'}
          </button>
        </div>
        {fetchOk !== null && (
          <p data-testid="fetch-ok" className="mt-1 text-[11px] text-status-published">
            ✓ Verified — fetched {fetchOk} captions. Review below, then plan your shorts.
          </p>
        )}
        {fetchError && (
          <p data-testid="fetch-error" className="mt-1 text-[11px] text-status-brief">
            {fetchError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="transcript" className="label">
          Transcript <span className="font-normal text-slate-500">— paste with timestamps for real cut points</span>
        </label>
        <textarea
          id="transcript"
          rows={7}
          className="input resize-none font-mono text-[11px]"
          placeholder={'0:00 Welcome back…\n0:42 The key finding is…\n2:15 Here\'s why it matters…'}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="shorts-count" className="label">How many shorts</label>
          <select
            id="shorts-count"
            className="input"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {COUNTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="shorts-audience" className="label">Audience</label>
          <select
            id="shorts-audience"
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value as ThreadAudience)}
          >
            {THREAD_AUDIENCES.map((a) => (
              <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn-primary w-full sm:w-auto" onClick={submit} disabled={loading}>
        {loading ? <Spinner size={16} label="Planning" /> : <VideoIcon width={16} height={16} />}
        {loading ? 'Planning…' : 'Plan shorts'}
      </button>

      {error && <ErrorState message={error} onRetry={submit} />}

      {result && !error && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {result.shorts.length} clip{result.shorts.length > 1 ? 's' : ''} · via {result.source}
            </p>
            <button className="btn-secondary py-1.5 text-xs" onClick={addToCalendar}>
              <PlusIcon width={14} height={14} /> Add to Drafting
            </button>
          </div>

          <ol data-testid="shorts-plan" className="space-y-2">
            {result.shorts.map((s, i) => (
              <li key={s.id} className="rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-200">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600/20 text-[11px] text-brand-400">
                      {i + 1}
                    </span>
                    {s.title}
                  </span>
                  {s.timeRange ? (
                    <span className="shrink-0 rounded bg-surface-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                      {s.timeRange}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-slate-500">no timestamps</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs italic text-slate-300">“{s.hook}”</p>
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-400">{s.caption}</p>
                <span className="mt-1 block text-[10px] text-slate-500">{s.caption.length}/{limit}</span>
                {s.startSeconds !== undefined && s.endSeconds !== undefined && (
                  <ClipRecipeBlock
                    startSeconds={s.startSeconds}
                    endSeconds={s.endSeconds}
                    index={i + 1}
                    videoUrl={videoUrl || undefined}
                  />
                )}
              </li>
            ))}
          </ol>

          {added && (
            <p data-testid="shorts-added" className="text-xs text-status-published">
              ✓ Added {result.shorts.length} YouTube short{result.shorts.length > 1 ? 's' : ''} to your Drafting column.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
