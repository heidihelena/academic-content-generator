import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { __setPersistence, useStore } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

function reset() {
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  useStore.setState({ posts: [], accounts: [] });
  window.location.hash = '';
}

const tab = (name: RegExp) => screen.getByRole('tab', { name });

describe('Library screen', () => {
  beforeEach(reset);

  it('consolidates Pipeline/Calendar/List/Content as view toggles', () => {
    render(<App initialView="board" />);
    expect(screen.getByRole('tablist', { name: /Library views/i })).toBeInTheDocument();
    expect(tab(/Pipeline/)).toHaveAttribute('aria-selected', 'true');
    for (const label of [/Calendar/, /List/, /Content/]) {
      expect(tab(label)).toBeInTheDocument();
    }
  });

  it('switches the active lens when a toggle is clicked', () => {
    render(<App initialView="board" />);
    fireEvent.click(tab(/Content/));
    expect(tab(/Content/)).toHaveAttribute('aria-selected', 'true');
    expect(tab(/Pipeline/)).toHaveAttribute('aria-selected', 'false');
  });

  it('deep-links straight to a sub-lens via the route', () => {
    render(<App initialView="list" />);
    expect(tab(/List/)).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the Library nav item highlighted on any sub-lens', () => {
    render(<App initialView="calendar" />);
    // One Library nav button (sidebar) + the active Calendar tab both reflect state.
    expect(screen.getByRole('button', { name: /^Library$/ })).toHaveAttribute('aria-current', 'page');
    expect(tab(/Calendar/)).toHaveAttribute('aria-selected', 'true');
  });
});
