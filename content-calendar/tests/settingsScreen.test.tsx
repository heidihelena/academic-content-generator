import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SettingsScreen } from '../src/components/SettingsScreen';
import { ApiClient, type ConnectionsReport, type LocalSettings } from '../src/lib/api';

const REPORT: ConnectionsReport = {
  inputs: { vaultPath: '/vault', persistenceDriver: 'sqlite', sqlitePath: '/local/content.sqlite' },
  providers: {
    llm: { active: 'mock', live: false },
    voice: { active: 'mock', live: false },
    video: { active: 'mock', live: false },
    embeddings: { active: 'mock', live: false },
  },
  social: [],
};

function mockApi(report: ConnectionsReport, settings: LocalSettings = {}) {
  vi.spyOn(ApiClient.prototype, 'connections').mockResolvedValue(report);
  vi.spyOn(ApiClient.prototype, 'settings').mockResolvedValue(settings);
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('SettingsScreen (inputs & storage)', () => {
  it('is read-only in local mode and shows the iCloud guidance', async () => {
    render(<SettingsScreen />);

    const inputs = await screen.findByLabelText('Inputs and storage');
    expect(within(inputs).getByLabelText('Obsidian vault path')).toHaveAttribute('placeholder', './vault');
    expect(within(inputs).getByText(/iCloud~md~obsidian/)).toBeInTheDocument();
    expect(within(inputs).getByText(/Read-only in local mode/)).toBeInTheDocument();
    expect(within(inputs).getByText(/two Macs can't corrupt it/)).toBeInTheDocument();
  });

  it('loads saved settings into the form and saves edits via the backend', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    mockApi(REPORT, { vaultPath: '/saved/Vault' });
    const save = vi.spyOn(ApiClient.prototype, 'saveSettings').mockImplementation(async (p) => p);

    render(<SettingsScreen />);

    const vault = (await screen.findByLabelText('Obsidian vault path')) as HTMLInputElement;
    await waitFor(() => expect(vault.value).toBe('/saved/Vault'));

    fireEvent.change(vault, { target: { value: '/icloud/Vault' } });
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ vaultPath: '/icloud/Vault' })),
    );
    expect(await screen.findByText(/restart the server to apply/i)).toBeInTheDocument();
  });
});
