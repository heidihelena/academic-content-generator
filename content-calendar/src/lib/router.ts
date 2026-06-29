import { useCallback, useEffect, useState } from 'react';
import type { View } from '../components/Sidebar';

/**
 * Minimal hash-based router (no dependency). Each top-level screen maps to
 * `#/<view>`, so screens are deep-linkable and the browser back/forward buttons
 * work. Kept tiny on purpose — the app has a fixed, small set of screens.
 *
 * `initial` is the fallback when the URL has no (valid) hash — e.g. the first
 * load, or tests that render a specific screen via the `initialView` prop.
 */
export const VIEWS: View[] = [
  'board',
  'calendar',
  'list',
  'inbox',
  'studio',
  'content',
  'campaigns',
  'ideas',
  'analytics',
  'connections',
  'settings',
];

/** The View encoded in the URL hash, or null if absent/unknown. */
export function viewFromHash(): View | null {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (VIEWS as string[]).includes(raw) ? (raw as View) : null;
}

export function useRoute(initial: View): [View, (view: View) => void] {
  const [view, setView] = useState<View>(() => viewFromHash() ?? initial);

  // Keep state in sync with back/forward navigation.
  useEffect(() => {
    const onHashChange = () => {
      const next = viewFromHash();
      if (next) setView(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: View) => {
    // Update the URL (adds a history entry) and the state synchronously so the
    // UI reacts immediately rather than waiting for the hashchange event.
    if (window.location.hash !== `#/${next}`) window.location.hash = `#/${next}`;
    setView(next);
  }, []);

  return [view, navigate];
}
