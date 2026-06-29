import { generateIdeasFromSource } from '../../idea-lab/ideaLabClient';
import { sourceMaterial, type Source } from '../../sources/sourcesTypes';
import { useExpandableAction } from './useExpandableAction';

/** Idea Lab — 5 source-grounded ideas, expanded inline under the active source. */
export function useSourceIdeas() {
  const action = useExpandableAction(
    async (source: Source) =>
      (await generateIdeasFromSource({ id: source.id, title: source.title, material: sourceMaterial(source) })).ideas,
    { errorFallback: 'Idea generation didn’t finish. It runs locally — try again.' },
  );

  return {
    activeId: action.activeId,
    ideas: action.data ?? [],
    busy: action.busy,
    error: action.error,
    toggle: action.toggle,
  };
}
