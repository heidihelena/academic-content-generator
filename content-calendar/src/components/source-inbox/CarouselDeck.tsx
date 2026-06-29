import type { CarouselResult } from '../../carousel/carouselClient';
import { Button, ErrorState, Spinner } from '../ui';

interface CarouselDeckProps {
  busy: boolean;
  error: string | null;
  deck: CarouselResult | null;
  onRetry: () => void;
  onDownload: () => void;
}

/** Inline slide-deck preview with its safety-review banner and a JSON download. */
export function CarouselDeck({ busy, error, deck, onRetry, onDownload }: CarouselDeckProps) {
  return (
    <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
      {busy ? (
        <Spinner />
      ) : error ? (
        <ErrorState title="Couldn’t build the slide deck" message={error} onRetry={onRetry} />
      ) : deck ? (
        <div className="space-y-3" data-testid="carousel-deck">
          <div
            className={`rounded-md px-3 py-2 text-xs ${
              deck.review.cleared ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
            }`}
          >
            {deck.review.cleared
              ? '✓ Safety review cleared — no blocking findings in the slide text.'
              : `⚠ Safety review blocked: ${deck.review.findings
                  .filter((f) => f.severity === 'block')
                  .map((f) => f.message)
                  .join('; ')}`}
          </div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="deck-slides">
            {deck.deck.slides.map((slide, i) => (
              <li key={i} className="rounded-md border border-surface-700 bg-surface-800/60 p-2">
                <span className="text-[10px] uppercase text-brand-400">{slide.kicker || slide.type}</span>
                <p className="mt-0.5 line-clamp-3 text-xs font-medium text-slate-200">{slide.title}</p>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              {deck.deck.slides.length} slides · {deck.deck.theme}
            </p>
            <Button variant="secondary" size="sm" onClick={onDownload}>
              Download deck JSON
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
