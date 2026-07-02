import { useCallback, useEffect, useState } from 'react';
import { createSource, listSources } from '../../sources/sourcesClient';
import { setSourceMeta } from '../../sources/sourceMeta';
import type { Source, SourceKind } from '../../sources/sourcesTypes';

export interface NewSourceValues {
  title: string;
  kind: SourceKind;
  url?: string;
  abstract?: string;
  project?: string;
  language?: string;
}

/** Strip the extension off an uploaded file's name to use as a source title. */
function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || name;
}

/** Read a file as text, tolerating environments without `File.text()`. */
function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Owns the source list: load, search, add — manually or from dropped files. */
export function useSourceList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      const created = await createSource({
        kind: values.kind,
        title: values.title,
        url: values.url || undefined,
        abstract: values.abstract || undefined,
      });
      if (values.project?.trim() || values.language?.trim()) {
        setSourceMeta(created.id, {
          project: values.project?.trim() || undefined,
          language: values.language?.trim() || undefined,
        });
      }
      setQuery('');
      await reload('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add that source. Check the title and try again.');
      return false;
    }
  };

  /**
   * Import dropped/picked files as sources. Markdown and plain-text files are
   * read in full (locally — nothing is uploaded anywhere); PDFs become a paper
   * entry to paste the abstract into.
   */
  const addFiles = async (files: File[]): Promise<void> => {
    let added = 0;
    let pdfs = 0;
    for (const file of files) {
      const name = file.name.toLowerCase();
      try {
        if (name.endsWith('.md') || name.endsWith('.txt')) {
          const text = await readFileText(file);
          await createSource({
            kind: 'note',
            title: titleFromFilename(file.name),
            abstract: text.trim().slice(0, 4000),
          });
          added += 1;
        } else if (name.endsWith('.pdf')) {
          await createSource({ kind: 'paper', title: titleFromFilename(file.name) });
          added += 1;
          pdfs += 1;
        }
      } catch {
        // Skip the file that failed; report what did import below.
      }
    }
    if (added === 0) {
      setNotice('Nothing imported — drop Markdown (.md), text (.txt) or PDF files.');
    } else {
      setNotice(
        pdfs > 0
          ? `Imported ${added} file${added === 1 ? '' : 's'}. For PDFs, open the source and paste the abstract — the text stays on this computer.`
          : `Imported ${added} file${added === 1 ? '' : 's'} — everything stays on this computer.`,
      );
      await reload('');
    }
  };

  return { sources, query, setQuery, loading, error, notice, setNotice, reload, submitSearch, addSource, addFiles };
}
