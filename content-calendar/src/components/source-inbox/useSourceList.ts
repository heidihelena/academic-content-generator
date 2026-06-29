import { useCallback, useEffect, useState } from 'react';
import { createSource, listSources } from '../../sources/sourcesClient';
import type { Source, SourceKind } from '../../sources/sourcesTypes';

export interface NewSourceValues {
  title: string;
  kind: SourceKind;
  url?: string;
  abstract?: string;
}

/** Owns the source list: load, search, and add. */
export function useSourceList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      setSources(await listSources(q));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Couldn’t load your sources — the local server may still be starting.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload('');
  }, [reload]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void reload(query);
  };

  /** Create a source, then reset the search and reload. Returns false on failure. */
  const addSource = async (values: NewSourceValues): Promise<boolean> => {
    try {
      await createSource({
        kind: values.kind,
        title: values.title,
        url: values.url || undefined,
        abstract: values.abstract || undefined,
      });
      setQuery('');
      await reload('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add that source. Check the title and try again.');
      return false;
    }
  };

  return { sources, query, setQuery, loading, error, reload, submitSearch, addSource };
}
