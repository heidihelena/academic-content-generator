import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConnectedAccounts } from '../src/components/ConnectedAccounts';
import { ApiClient } from '../src/lib/api';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

beforeEach(() => {
  vi.useRealTimers();
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
  __setPersistence(new MemoryPersistence());
  useStore.setState({
    accounts: [
      { platform: 'linkedin', status: 'disconnected' },
      { platform: 'bluesky', status: 'disconnected' },
    ],
    accountBusy: {},
    accountError: {},
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('in-app provider (developer app) credentials', () => {
  it('lets the user save LinkedIn app credentials from the LinkedIn row', async () => {
    vi.spyOn(ApiClient.prototype, 'providerCredentials').mockResolvedValue({ linkedin: false, x: false });
    const save = vi
      .spyOn(ApiClient.prototype, 'saveProviderCredentials')
      .mockResolvedValue({ platform: 'linkedin', configured: true });

    render(<ConnectedAccounts />);
    const row = await screen.findByTestId('account-linkedin');

    // The LinkedIn row explains what's needed and offers the form.
    expect(within(row).getByText(/Client ID & Secret/)).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: /Add app credentials/i }));

    fireEvent.change(within(row).getByLabelText('LinkedIn client ID'), { target: { value: 'id-1' } });
    fireEvent.change(within(row).getByLabelText('LinkedIn client secret'), { target: { value: 's3cret' } });
    fireEvent.click(within(row).getByRole('button', { name: /Save credentials/i }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith('linkedin', { clientId: 'id-1', clientSecret: 's3cret' }),
    );
  });

  it('shows the saved state when credentials are already configured', async () => {
    vi.spyOn(ApiClient.prototype, 'providerCredentials').mockResolvedValue({ linkedin: true, x: false });

    render(<ConnectedAccounts />);
    const row = await screen.findByTestId('account-linkedin');
    await waitFor(() =>
      expect(within(row).getByText(/App credentials saved on this Mac/)).toBeInTheDocument(),
    );
    expect(within(row).getByRole('button', { name: /Update app credentials/i })).toBeInTheDocument();
  });

  it('does not offer app credentials on account-credential platforms like Bluesky', async () => {
    vi.spyOn(ApiClient.prototype, 'providerCredentials').mockResolvedValue({ linkedin: false, x: false });
    render(<ConnectedAccounts />);
    const bluesky = await screen.findByTestId('account-bluesky');
    expect(within(bluesky).queryByRole('button', { name: /app credentials/i })).toBeNull();
  });
});
