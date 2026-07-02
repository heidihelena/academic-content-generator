import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SettingsScreen } from '../src/components/SettingsScreen';
import { ApiClient, type ConnectionsReport } from '../src/lib/api';

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

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('SettingsScreen (privacy model)', () => {
  it('leads with the privacy card in local mode: everything stays on this computer', () => {
    // Force local mode even when a developer's .env.local points at an API.
    vi.stubEnv('VITE_API_URL', '');
    render(<SettingsScreen />);

    const privacy = within(screen.getByLabelText('Privacy — what leaves this computer'));
    expect(
      privacy.getByText('Local mode — everything stays on this computer'),
    ).toBeInTheDocument();

    // Sources/drafts/notes, voice profiles and AI drafting all stay local.
    expect(privacy.getAllByText('stays local')).toHaveLength(3);
    expect(privacy.getByText('Sources, drafts, notes')).toBeInTheDocument();
    expect(privacy.getByText('Voice profiles')).toBeInTheDocument();
    expect(privacy.getByText('AI drafting & ideas')).toBeInTheDocument();

    // The two explicit opt-ins are called out.
    expect(
      privacy.getByText(/Sent to an LLM provider only if you enable one/),
    ).toBeInTheDocument();
    expect(
      privacy.getByText(/Sent to the social platform only when you press publish/),
    ).toBeInTheDocument();

    expect(privacy.getByText('stored on this computer')).toBeInTheDocument();
    expect(
      privacy.getByText(/Nothing is sent anywhere without an explicit opt-in/),
    ).toBeInTheDocument();
  });

  it('states the connected mode when VITE_API_URL is set', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    vi.spyOn(ApiClient.prototype, 'connections').mockResolvedValue(REPORT);
    vi.spyOn(ApiClient.prototype, 'settings').mockResolvedValue({});
    render(<SettingsScreen />);

    const privacy = within(screen.getByLabelText('Privacy — what leaves this computer'));
    expect(privacy.getByText('Connected to your local server')).toBeInTheDocument();
  });
});
