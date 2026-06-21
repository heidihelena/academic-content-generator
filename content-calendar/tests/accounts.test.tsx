import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { __setIntegration } from '../src/integrations/registry';
import { MockPlatformIntegration } from '../src/integrations/mockIntegration';

function resetStore() {
  __setPersistence(new MemoryPersistence());
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

function gotoAccounts() {
  fireEvent.click(screen.getByRole('button', { name: /Accounts/i }));
}

describe('ConnectedAccounts UI', () => {
  beforeEach(resetStore);

  it('shows initial connection states for all platforms', () => {
    render(<App />);
    gotoAccounts();
    expect(screen.getByTestId('account-instagram')).toBeInTheDocument();
    expect(screen.getByTestId('account-status-instagram')).toHaveTextContent('Connected');
    expect(screen.getByTestId('account-status-linkedin')).toHaveTextContent('Connected');
    expect(screen.getByTestId('account-status-threads')).toHaveTextContent('Not connected');
  });

  it('connects a disconnected account', async () => {
    __setIntegration(
      'threads',
      new MockPlatformIntegration('threads', {
        handle: '@vahtian',
        displayName: 'vahtian',
        followers: 4210,
        latencyMs: 0,
      }),
    );
    render(<App />);
    gotoAccounts();

    const row = screen.getByTestId('account-threads');
    fireEvent.click(within(row).getByRole('button', { name: /Connect/i }));

    await vi.runAllTimersAsync();

    expect(screen.getByTestId('account-status-threads')).toHaveTextContent('Connected');
  });

  it('shows an error state and a retry button when connecting fails', async () => {
    __setIntegration(
      'threads',
      new MockPlatformIntegration('threads', {
        handle: '@x',
        displayName: 'x',
        followers: 0,
        failConnect: true,
        latencyMs: 0,
      }),
    );
    render(<App />);
    gotoAccounts();

    const row = screen.getByTestId('account-threads');
    fireEvent.click(within(row).getByRole('button', { name: /Connect/i }));

    await vi.runAllTimersAsync();

    expect(screen.getByTestId('account-status-threads')).toHaveTextContent('Connection error');
    expect(within(screen.getByTestId('account-threads')).getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('disconnects a connected account', async () => {
    render(<App />);
    gotoAccounts();

    const row = screen.getByTestId('account-instagram');
    fireEvent.click(within(row).getByRole('button', { name: /Disconnect/i }));

    await vi.runAllTimersAsync();

    expect(screen.getByTestId('account-status-instagram')).toHaveTextContent('Not connected');
  });
});
