import { useState } from 'react';
import type { Source } from '../../sources/sourcesTypes';
import { useAsyncAction } from '../../hooks/useAsyncAction';

/**
 * A per-source async action that expands inline under one source at a time:
 * clicking a source runs the action and opens its panel; clicking the same
 * source again (while idle) closes it. Builds on `useAsyncAction` for the
 * loading/error/data triad.
 */
export function useExpandableAction<TData>(
  fn: (source: Source) => Promise<TData>,
  options: { errorFallback?: string } = {},
) {
  const action = useAsyncAction(fn, options);
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggle = (source: Source) => {
    // Re-clicking the open source (when idle) collapses it.
    if (activeId === source.id && !action.loading) {
      setActiveId(null);
      action.reset();
      return undefined;
    }
    setActiveId(source.id);
    action.reset();
    return action.run(source);
  };

  // Re-run for the open source without the collapse-on-idle toggle behaviour —
  // so an error-state "Retry" actually retries instead of closing the panel.
  const retry = (source: Source) => {
    setActiveId(source.id);
    action.reset();
    return action.run(source);
  };

  return {
    activeId,
    data: action.data,
    busy: action.loading,
    error: action.error,
    toggle,
    retry,
  };
}
