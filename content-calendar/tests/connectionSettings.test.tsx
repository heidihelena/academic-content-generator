import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConnectedAccounts } from '../src/components/ConnectedAccounts';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

function seed(status: 'disconnected' | 'connected' = 'disconnected') {
  // The mock integration simulates latency; use real timers so verify resolves.
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  useStore.setState({
    accounts: [{ platform: 'bluesky', status }],
    accountBusy: {},
    accountError: {},
  });
}

describe('Connection settings — verify & connect', () => {
  beforeEach(() => seed());

  it('reveals a credential form for Bluesky and connects after verify', async () => {
    render(<ConnectedAccounts />);
    const row = screen.getByTestId('account-bluesky');

    // Not connected yet.
    expect(within(row).getByTestId('account-status-bluesky')).toHaveTextContent('Not connected');

    // Open the credential form and fill it in.
    fireEvent.click(within(row).getByRole('button', { name: /Connect/i }));
    fireEvent.change(screen.getByLabelText('Bluesky handle'), { target: { value: 'me.bsky.social' } });
    fireEvent.change(screen.getByLabelText('Bluesky app password'), { target: { value: 'pw-pw-pw' } });

    fireEvent.click(screen.getByRole('button', { name: /Verify & connect/i }));

    // Verified → the row flips to Connected (mock integration succeeds locally).
    await waitFor(() =>
      expect(screen.getByTestId('account-status-bluesky')).toHaveTextContent('Connected'),
    );
  });

  it('does not show a credential form for already-connected accounts', () => {
    seed('connected');
    render(<ConnectedAccounts />);
    expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Bluesky handle')).not.toBeInTheDocument();
  });
});
