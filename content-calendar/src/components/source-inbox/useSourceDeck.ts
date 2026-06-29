import { generateCarousel } from '../../carousel/carouselClient';
import { sourceMaterial, type Source } from '../../sources/sourcesTypes';
import { useExpandableAction } from './useExpandableAction';

/** Carousel — a deck + safety review, expanded inline under the active source. */
export function useSourceDeck() {
  const action = useExpandableAction(
    async (source: Source) =>
      generateCarousel({ id: source.id, title: source.title, material: sourceMaterial(source) }),
    { errorFallback: 'Couldn’t build the slide deck. Try again.' },
  );

  const download = (title: string) => {
    const result = action.data;
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.deck, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `${title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'deck'}.json`;
    a.click();
    URL.revokeObjectURL(href);
  };

  return {
    activeId: action.activeId,
    deck: action.data,
    busy: action.busy,
    error: action.error,
    toggle: action.toggle,
    retry: action.retry,
    download,
  };
}
