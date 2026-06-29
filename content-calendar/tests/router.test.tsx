import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { viewFromHash } from '../src/lib/router';
import { __setPersistence, useStore } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

function reset() {
  // `findBy*` polling needs real timers (global setup installs fake ones).
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  useStore.setState({ posts: [], accounts: [] });
}

describe('viewFromHash', () => {
  beforeEach(() => {
    window.location.hash = '';
  });
  afterEach(() => {
    window.location.hash = '';
  });

  it('returns null when there is no (valid) hash', () => {
    expect(viewFromHash()).toBeNull();
    window.location.hash = '#/not-a-screen';
    expect(viewFromHash()).toBeNull();
  });

  it('decodes a known screen from the hash', () => {
    window.location.hash = '#/connections';
    expect(viewFromHash()).toBe('connections');
  });

  it('no longer recognizes the removed accounts route', () => {
    window.location.hash = '#/accounts';
    expect(viewFromHash()).toBeNull();
  });
});

describe('navigation shell', () => {
  beforeEach(reset);

  it('groups the sidebar and merges Accounts into Connections', () => {
    render(<App />);
    // Section headers exist…
    for (const label of ['Create', 'Plan', 'Publish', 'Measure']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // …Connections remains, the standalone Accounts nav item is gone.
    expect(screen.getByRole('button', { name: /Connections/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Accounts$/ })).toBeNull();
  });

  it('deep-links to a screen from the URL hash', async () => {
    window.location.hash = '#/inbox';
    render(<App />);
    // The Source Inbox screen renders its list rather than the default Pipeline.
    expect(await screen.findByTestId('source-list')).toBeInTheDocument();
  });
});
