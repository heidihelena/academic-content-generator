import { useState } from 'react';
import type { Platform } from '../types';
import type { IdeaResponse, Tone } from '../ai/types';
import { generateIdeas } from '../ai/ideaService';
import { PLATFORMS, getPlatformMeta } from '../lib/platforms';
import { useStore } from '../store/useStore';
import { PLATFORM_GLYPHS, SparkleIcon, PlusIcon } from './icons';
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/States';

const TONES: Tone[] = ['professional', 'casual', 'witty', 'inspirational', 'educational', 'bold'];

/**
 * "Generate Ideas" AI assistant.
 *
 * Collects niche / audience / tone / platform, calls the swappable idea service,
 * and renders 5 structured ideas. Each idea can be turned into a draft post,
 * pre-filling the editor — connecting the AI feature to the calendar workflow.
 */
export function GenerateIdeas() {
  const openEditorForNewPost = useStore((s) => s.openEditorForNewPost);

  const [niche, setNiche] = useState('My research on urban heat & climate equity');
  const [audience, setAudience] = useState('General public & policymakers');
  const [tone, setTone] = useState<Tone>('educational');
  const [platform, setPlatform] = useState<Platform>('bluesky');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdeaResponse | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateIdeas({ niche, audience, tone, platform });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate ideas.');
    } finally {
      setLoading(false);
    }
  };

  const useIdea = (topic: string, hook: string) => {
    const at = new Date();
    at.setHours(9, 0, 0, 0);
    at.setDate(at.getDate() + 1);
    // Pre-fill body with hook + topic so the manager starts from a real draft.
    // We open a new post then immediately can't set body via store, so we encode
    // it through the editor by creating the post first; the editor reads it live.
    openEditorForNewPost(platform, at.toISOString());
    // The created post starts empty; persist the suggested copy by updating it.
    const state = useStore.getState();
    const newest = state.posts[state.posts.length - 1];
    if (newest) {
      state.savePost({
        id: newest.id,
        platform,
        body: `${hook}\n\n${topic}`,
        scheduledAt: newest.scheduledAt,
        status: 'draft',
        media: [],
      });
      // Re-open the editor on the now-populated post for final edits.
      state.openEditor(newest.id);
    }
  };

  return (
    <section aria-label="Generate ideas" className="space-y-4">
      <div className="card p-4">
        <header className="mb-4 flex items-center gap-2">
          <SparkleIcon width={18} height={18} className="text-brand-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Generate Ideas</h2>
            <p className="text-xs text-slate-500">
              Describe your goal and the AI assistant returns 5 ready-to-use post ideas.
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="idea-niche" className="label">Research area / topic</label>
            <input id="idea-niche" className="input" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Your field or a specific paper" />
          </div>
          <div>
            <label htmlFor="idea-audience" className="label">Target audience</label>
            <input id="idea-audience" className="input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. General public, students, peers" />
          </div>
          <div>
            <label htmlFor="idea-tone" className="label">Tone</label>
            <select id="idea-tone" className="input" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
              {TONES.map((t) => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Platform</span>
            <div className="flex gap-1.5">
              {PLATFORMS.map((p) => {
                const Glyph = PLATFORM_GLYPHS[p];
                const active = platform === p;
                return (
                  <button key={p} onClick={() => setPlatform(p)} aria-pressed={active}
                    className={`btn flex-1 py-2 ${active ? 'bg-surface-600' : 'bg-surface-800 hover:bg-surface-700'}`}
                    style={active ? { color: getPlatformMeta(p).color } : undefined}>
                    <Glyph width={16} height={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button className="btn-primary mt-4 w-full sm:w-auto" onClick={submit} disabled={loading}>
          {loading ? <Spinner size={16} label="Generating" /> : <SparkleIcon width={16} height={16} />}
          {loading ? 'Generating…' : 'Generate 5 ideas'}
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={submit} />}

      {result && !error && (
        <div className="grid gap-3">
          <p className="text-xs text-slate-500">
            {result.ideas.length} ideas for <span className="text-slate-300">{result.request.niche}</span>{' '}
            on {getPlatformMeta(result.request.platform).name} · via {result.source}
          </p>
          {result.ideas.map((idea, i) => (
            <article key={idea.id} data-testid="idea-card" className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600/20 text-[11px] font-semibold text-brand-400">
                      {i + 1}
                    </span>
                    <h3 className="text-sm font-medium text-slate-200">{idea.topic}</h3>
                  </div>
                  <p className="mt-2 text-sm italic text-slate-300">“{idea.hook}”</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-md bg-surface-700 px-2 py-0.5 capitalize text-slate-300">
                      {idea.recommendedFormat}
                    </span>
                    <span className="text-slate-500">{idea.platformFit}</span>
                  </div>
                </div>
                <button
                  className="btn-secondary shrink-0 py-1.5 text-xs"
                  onClick={() => useIdea(idea.topic, idea.hook)}
                >
                  <PlusIcon width={14} height={14} /> Use
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
