import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConnectionsView } from '../src/components/ConnectionsView';
import { ApiClient, type ConnectionsReport, type LocalSettings } from '../src/lib/api';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

const REPORT: ConnectionsReport = {
  inputs: { vaultPath: '/vault', persistenceDriver: 'sqlite', sqlitePath: '/local/content.sqlite' },
  providers: {
    llm: { active: 'anthropic', live: true },
    voice: { active: 'elevenlabs', live: true },
    video: { active: 'mock', live: false },
    embeddings: { active: 'mock', live: false },
  },
  social: [{ platform: 'bluesky', method: 'app-password', configured: true }],
};

function mockApi(report: ConnectionsReport, settings: LocalSettings = {}) {
  vi.spyOn(ApiClient.prototype, 'connections').mockResolvedValue(report);
  vi.spyOn(ApiClient.prototype, 'settings').mockResolvedValue(settings);
}

beforeEach(() => {
  vi.useRealTimers();
  // ConnectedAccounts (embedded) reads the store; give it a known account.
  __setPersistence(new MemoryPersistence());
  useStore.setState({ accounts: [{ platform: 'bluesky', status: 'disconnected' }], accountBusy: {}, accountError: {} });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('ConnectionsView', () => {
  it('shows mock generators and read-only setup guidance in local mode', async () => {
    render(<ConnectionsView />);

    // Inputs are read-only in local mode: the vault field shows the effective
    // value as a placeholder, and the local-Mac iCloud hint is present.
    const inputs = await screen.findByLabelText('Inputs and storage');
    expect(within(inputs).getByLabelText('Obsidian vault path')).toHaveAttribute('placeholder', './vault');
    expect(within(inputs).getByText(/iCloud~md~obsidian/)).toBeInTheDocument();
    expect(within(inputs).getByText(/Read-only in local mode/)).toBeInTheDocument();

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
    mockApi(REPORT);

    render(<ConnectionsView />);

    const generators = await screen.findByLabelText('Content generators');
    expect(within(generators).getByText('anthropic')).toBeInTheDocument();
    expect(within(generators).getByText('elevenlabs')).toBeInTheDocument();

    // SQLite is kept local now — the guidance says so, no iCloud-corruption banner.
    const inputs = screen.getByLabelText('Inputs and storage');
    expect(within(inputs).getByText(/two Macs can't corrupt it/)).toBeInTheDocument();
    expect(within(inputs).queryByText(/in iCloud can corrupt/)).not.toBeInTheDocument();

    const publishing = screen.getByLabelText('Publishing destinations');
    expect(within(publishing).getByText('Configured')).toBeInTheDocument();
  });

  it('loads saved settings into the form and saves edits via the backend', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    mockApi(REPORT, { vaultPath: '/saved/Vault' });
    const save = vi
      .spyOn(ApiClient.prototype, 'saveSettings')
      .mockImplementation(async (p) => p);

    render(<ConnectionsView />);

    // The saved override populates the field (placeholder shows the boot value).
    const vault = (await screen.findByLabelText('Obsidian vault path')) as HTMLInputElement;
    await waitFor(() => expect(vault.value).toBe('/saved/Vault'));

    fireEvent.change(vault, { target: { value: '/icloud/Vault' } });
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ vaultPath: '/icloud/Vault' })),
    );
    expect(await screen.findByText(/restart the server to apply/i)).toBeInTheDocument();
  });

  it('falls back to local defaults with a notice when the backend is offline', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    vi.spyOn(ApiClient.prototype, 'connections').mockRejectedValue(new Error('network'));

    render(<ConnectionsView />);

    await waitFor(() => expect(screen.getByText(/Backend unreachable/)).toBeInTheDocument());
    expect(within(screen.getByLabelText('Content generators')).getAllByText('mock')).toHaveLength(4);
    // Offline ⇒ not editable ⇒ read-only note.
    expect(screen.getByText(/Read-only in local mode/)).toBeInTheDocument();
  });
});
