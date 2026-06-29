import { useCallback, useState } from 'react';

export interface AsyncAction<TArgs extends unknown[], TData> {
  /** The most recent successful result, or null before the first success / after reset. */
  data: TData | null;
  /** A human-readable message from the most recent failure, or null. */
  error: string | null;
  /** True while a `run` is in flight. */
  loading: boolean;
  /** Invoke the async function: toggles `loading`, clears `error`, stores `data`. */
  run: (...args: TArgs) => Promise<TData | undefined>;
  /** Clear data, error, and loading back to the initial state. */
  reset: () => void;
}

/**
 * Wraps a single async function in the loading / error / data triad that screens
 * across the app re-implement by hand. `run` sets `loading`, clears `error`,
 * resolves to the result (or `undefined` on failure, with `error` populated).
 *
 *   const ideas = useAsyncAction((s: Source) => fetchIdeas(s), { errorFallback: '…' });
 *   ideas.run(source); // ideas.loading → ideas.data / ideas.error
 */
export function useAsyncAction<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<TData>,
  options: { errorFallback?: string } = {},
): AsyncAction<TArgs, TData> {
  const { errorFallback = 'Something went wrong.' } = options;
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : errorFallback);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [fn, errorFallback],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, run, reset };
}
