/**
 * Theme switching for the "ink & paper" palette.
 *
 *   dark  → ink paper: dark green-black page, warm paper text (the default)
 *   light → paper & ink: warm off-white paper page, dark ink text
 *
 * The actual colors live as CSS variables in index.css, keyed off the `dark`
 * class on <html>; this module only flips that class and remembers the choice.
 * The initial class is set by an inline script in index.html so there is no
 * flash of the wrong theme on load.
 */
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'forskai-theme';

export function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode / storage disabled — the in-memory class still applies */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
