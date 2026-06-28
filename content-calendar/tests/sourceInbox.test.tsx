import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { LocalSourcesClient, setSourcesClient } from '../src/sources/sourcesClient';
import { LocalVaultClient, setVaultClient } from '../src/vault/vaultClient';
import type { Source } from '../src/sources/sourcesTypes';

const SEED: Source[] = [
  {
    id: 'src_trees',
    kind: 'paper',
    title: 'Street trees and urban heat',
    abstract: 'Tree cover was associated with cooler streets.',
    tags: ['urban'],
    importedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'vault_sleep',
    kind: 'note',
    title: 'Sleep and memory',
    body: 'memory consolidation',
    tags: ['neuro'],
    importedAt: '2026-01-01T00:00:00.000Z',
  },
];

function reset() {
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  setSourcesClient(new LocalSourcesClient(SEED));
  setVaultClient(
    new LocalVaultClient([
      { id: 'vault_heat', source: 'urban-heat/notes.md', title: 'Canopy and heat', content: 'street trees shade pavement and cool blocks' },
      { id: 'vault_sleep2', source: 'neuro/sleep.md', title: 'Sleep', content: 'slow-wave sleep aids memory' },
    ]),
  );
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

describe('Source Inbox', () => {
  beforeEach(reset);

  it('lists sources and badges vault-backed notes', async () => {
    render(<App initialView="inbox" />);
    const list = await screen.findByTestId('source-list');
    const items = within(list).getAllByRole('listitem');
    expect(items.length).toBe(2);
    expect(within(list).getByText('Sleep and memory')).toBeInTheDocument();
    expect(within(list).getByText('vault')).toBeInTheDocument(); // the note's badge
  });

  it('searches the inbox', async () => {
    render(<App initialView="inbox" />);
    await screen.findByTestId('source-list');
    fireEvent.change(screen.getByLabelText('Search sources'), { target: { value: 'urban' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      const items = within(screen.getByTestId('source-list')).getAllByRole('listitem');
      expect(items.length).toBe(1);
    });
    expect(screen.getByText('Street trees and urban heat')).toBeInTheDocument();
  });

  it('sends a source into the Draft Studio, pre-filling Compose', async () => {
    render(<App initialView="inbox" />);
    await screen.findByTestId('source-list');

    const treesItem = screen.getByText('Street trees and urban heat').closest('li')!;
    fireEvent.click(within(treesItem).getByRole('button', { name: /Draft in Studio/i }));

    // We are now in the Draft Studio with Compose pre-filled from the source.
    expect((screen.getByLabelText('Source title') as HTMLInputElement).value).toBe(
      'Street trees and urban heat',
    );
    expect(
      (screen.getByLabelText('Source material (abstract / notes)') as HTMLTextAreaElement).value,
    ).toContain('cooler streets');
    // Forward is enabled because the source filled both fields.
    expect(screen.getByRole('button', { name: /Generate draft/i })).toBeEnabled();
  });

  it('searches the vault by meaning and drafts from a passage', async () => {
    render(<App initialView="inbox" />);
    await screen.findByTestId('source-list');

    fireEvent.click(screen.getByRole('button', { name: /Search vault/i }));
    const vaultInput = screen.getByLabelText('Search your vault');
    fireEvent.change(vaultInput, { target: { value: 'trees pavement' } });
    fireEvent.click(within(vaultInput.closest('form')!).getByRole('button', { name: 'Search' }));

    const hits = await screen.findByTestId('vault-hits');
    const items = within(hits).getAllByRole('listitem');
    expect(items.length).toBe(1);
    expect(within(hits).getByText('Canopy and heat')).toBeInTheDocument();

    fireEvent.click(within(hits).getByRole('button', { name: /Draft in Studio/i }));
    expect((screen.getByLabelText('Source title') as HTMLInputElement).value).toBe('Canopy and heat');
    expect(
      (screen.getByLabelText('Source material (abstract / notes)') as HTMLTextAreaElement).value,
    ).toContain('street trees shade pavement');
  });
});
