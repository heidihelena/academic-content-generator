import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { LocalStudioEngine, setStudioEngine } from '../src/studio/studioEngine';

/**
 * Automated structural a11y checks (labels, roles, ARIA, landmarks, headings)
 * on the real screens, rendered through the app shell. Runs axe-core in jsdom —
 * which skips colour-contrast (no layout), so those are covered by the
 * Playwright axe scan (e2e/a11y.spec.ts) in a real browser instead.
 */
function reset() {
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  setStudioEngine(new LocalStudioEngine());
  useStore.setState({
    posts: [],
    accounts: [],
    platformFilter: 'all',
    statusFilter: 'all',
    editingPostId: null,
    isEditorOpen: false,
    accountBusy: {},
    accountError: {},
    weekAnchor: new Date().toISOString(),
  });
}

/** Human-readable list of violations, so a failure shows what's wrong at a glance. */
async function violations(container: HTMLElement): Promise<string[]> {
  const results = await axe(container);
  return results.violations.map((v) => `${v.id} (${v.impact}) — ${v.help} [${v.nodes.length} node(s)]`);
}

describe('accessibility (axe · component level)', () => {
  beforeEach(reset);

  it('Draft Studio has no structural a11y violations', async () => {
    const { container } = render(<App initialView="studio" />);
    await screen.findByLabelText('Source title');
    expect(await violations(container)).toEqual([]);
  });

  it('Source Inbox has no structural a11y violations', async () => {
    const { container } = render(<App initialView="inbox" />);
    await screen.findByLabelText('Search sources');
    expect(await violations(container)).toEqual([]);
  });

  it('Home screen has no structural a11y violations', async () => {
    const { container } = render(<App initialView="home" />);
    await screen.findByRole('heading', { level: 1 });
    expect(await violations(container)).toEqual([]);
  });

  it('Pipeline board has no structural a11y violations', async () => {
    // The board renders post cards, each of which contains both an "open editor"
    // control and a selection checkbox. Guards against nested-interactive
    // regressions (the card uses a stretched button, not a role="button" wrapper).
    const { container } = render(<App initialView="board" />);
    await screen.findByRole('region', { name: 'Pipeline board' });
    expect(await violations(container)).toEqual([]);
  });
});
