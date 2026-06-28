import { useEffect, useState } from 'react';
import type { Source } from '../sources/sourcesTypes';
import { sourceMaterial } from '../sources/sourcesTypes';
import type { StudioSeed } from '../studio/studioTypes';
import { repurposeSource, type RepurposeResult } from '../repurpose/repurposeSource';
import type { CarouselDeck } from '../carousel/carouselClient';
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/States';

interface RepurposePanelProps {
  source: Source;
  /** Send a format's text into the Draft Studio (pre-fills the Compose stage). */
  onDraft: (seed: StudioSeed) => void;
}

function downloadDeck(deck: CarouselDeck, title: string): void {
  const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'deck'}.json`;
  a.click();
  URL.revokeObjectURL(href);
}

/**
 * Repurpose panel — fans one source out into every format at once (ideas,
 * carousel, thread) and lets the author draft from any of them. Each format
 * renders independently, so one failure shows an inline error without hiding
 * the others.
 */
export function RepurposePanel({ source, onDraft }: RepurposePanelProps) {
  const [result, setResult] = useState<RepurposeResult | null>(null);
  const [loading, setLoading] = useState(true);

  const material = sourceMaterial(source);

  useEffect(() => {
    let live = true;
    setLoading(true);
    void repurposeSource({ id: source.id, title: source.title, material, sourceUrl: source.url })
      .then((r) => live && setResult(r))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [source.id, source.title, source.url, material]);

  if (loading || !result) {
    return (
      <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3" data-testid="repurpose-panel">
      {/* Ideas */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-300">Ideas</h4>
        {result.ideas.status === 'error' ? (
          <ErrorState title="Ideas unavailable" message={result.ideas.message} />
        ) : (
          <ul className="space-y-2" data-testid="repurpose-ideas">
            {result.ideas.data.map((idea) => (
              <li
                key={idea.id}
                className="flex items-start justify-between gap-3 rounded-md border border-surface-700 bg-surface-800/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                      {idea.channel}
                    </span>
                    <span className="truncate text-sm font-medium text-slate-200">{idea.angle}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{idea.hook}</p>
                </div>
                <button
                  className="btn-secondary shrink-0 py-1 text-xs"
                  onClick={() => onDraft({ title: idea.angle, material: `${idea.hook}\n\n${material}`, sourceId: source.id })}
                >
                  Draft →
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Carousel */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-300">Carousel</h4>
        {result.carousel.status === 'error' ? (
          <ErrorState title="Carousel unavailable" message={result.carousel.message} />
        ) : (
          <div className="space-y-2" data-testid="repurpose-carousel">
            <div
              className={`rounded-md px-3 py-2 text-xs ${
                result.carousel.data.review.cleared
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-rose-500/10 text-rose-300'
              }`}
            >
              {result.carousel.data.review.cleared
                ? '✓ Safety review cleared.'
                : `⚠ Safety review blocked: ${result.carousel.data.review.findings
                    .filter((f) => f.severity === 'block')
                    .map((f) => f.message)
                    .join('; ')}`}
            </div>
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {result.carousel.data.deck.slides.map((slide, i) => (
                <li key={i} className="rounded-md border border-surface-700 bg-surface-800/60 p-2">
                  <span className="text-[10px] uppercase text-brand-400">{slide.kicker || slide.type}</span>
                  <p className="mt-0.5 line-clamp-3 text-xs font-medium text-slate-200">{slide.title}</p>
                </li>
              ))}
            </ol>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">{result.carousel.data.deck.slides.length} slides</p>
              <button
                className="btn-secondary py-1 text-xs"
                onClick={() => downloadDeck(result.carousel.status === 'ok' ? result.carousel.data.deck : ({} as CarouselDeck), source.title)}
              >
                Download deck JSON
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Thread */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-300">Thread</h4>
        {result.thread.status === 'error' ? (
          <ErrorState title="Thread unavailable" message={result.thread.message} />
        ) : (
          <div className="space-y-2" data-testid="repurpose-thread">
            <ol className="space-y-1.5">
              {result.thread.data.map((part, i) => (
                <li key={i} className="rounded-md border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
                  <span className="mr-1.5 text-[10px] text-slate-500">{i + 1}/{result.thread.status === 'ok' ? result.thread.data.length : 0}</span>
                  {part}
                </li>
              ))}
            </ol>
            <button
              className="btn-secondary py-1 text-xs"
              onClick={() =>
                onDraft({
                  title: source.title,
                  material: result.thread.status === 'ok' ? result.thread.data.join('\n\n') : material,
                  sourceId: source.id,
                })
              }
            >
              Draft from thread →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
