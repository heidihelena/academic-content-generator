import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { ConnectionsView } from '../src/components/ConnectionsView';
import { ApiClient, type ConnectionsReport } from '../src/lib/api';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

beforeEach(() => {
  vi.useRealTimers();
  // ConnectedAccounts (embedded) reads the store; give it a known account.
  __setPersistence(new MemoryPersistence());
  useStore.setState({ accounts: [{ platform: 'bluesky', status: 'disconnected' }], accountBusy: {}, accountError: {} });
});

afterEach(() => vi.unstubAllEnvs());

describe('ConnectionsView', () => {
  it('shows mock generators and local-setup guidance in local mode', async () => {
    render(<ConnectionsView />);

    // Inputs & storage with the iCloud path hint.
    const inputs = await screen.findByLabelText('Inputs and storage');
    expect(within(inputs).getByText('./vault')).toBeInTheDocument();
    expect(within(inputs).getByText(/iCloud~md~obsidian/)).toBeInTheDocument();

    // Every content generator reads as mock by default.
    const generators = screen.getByLabelText('Content generators');
    expect(within(generators).getAllByText('mock')).toHaveLength(4);

    // Publishing destinations list the platforms and their connect method.
    const publishing = screen.getByLabelText('Publishing destinations');
    expect(within(publishing).getByText('bluesky')).toBeInTheDocument();
    expect(within(publishing).getAllByText('Not connected').length).toBeGreaterThan(0);
  });

  it('marks a provider live when the backend reports a real key', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    const report: ConnectionsReport = {
      inputs: { vaultPath: '/vault', persistenceDriver: 'sqlite', sqlitePath: '/icloud/content.sqlite' },
      providers: {
        llm: { active: 'anthropic', live: true },
        voice: { active: 'elevenlabs', live: true },
        video: { active: 'mock', live: false },
        embeddings: { active: 'mock', live: false },
      },
      social: [{ platform: 'bluesky', method: 'app-password', configured: true }],
    };
    vi.spyOn(ApiClient.prototype, 'connections').mockResolvedValue(report);

    render(<ConnectionsView />);

    const generators = await screen.findByLabelText('Content generators');
    expect(within(generators).getByText('anthropic')).toBeInTheDocument();
    expect(within(generators).getByText('elevenlabs')).toBeInTheDocument();

    // SQLite-in-iCloud corruption warning surfaces for the sqlite driver.
    const inputs = screen.getByLabelText('Inputs and storage');
    expect(within(inputs).getByText(/corrupt if two Macs open it at once/)).toBeInTheDocument();

    const publishing = screen.getByLabelText('Publishing destinations');
    expect(within(publishing).getByText('Configured')).toBeInTheDocument();
  });

  it('falls back to local defaults with a notice when the backend is offline', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    vi.spyOn(ApiClient.prototype, 'connections').mockRejectedValue(new Error('network'));

    render(<ConnectionsView />);

    await waitFor(() => expect(screen.getByText(/Backend unreachable/)).toBeInTheDocument());
    expect(within(screen.getByLabelText('Content generators')).getAllByText('mock')).toHaveLength(4);
  });
});
