import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { __setPersistence, useStore } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { LocalContentClient, setContentClient } from '../src/content/contentClient';

function resetStore() {
  vi.useRealTimers();
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

describe('Content view (ContentItem → variants)', () => {
  beforeEach(() => {
    resetStore();
    setContentClient(new LocalContentClient()); // fresh sample data per test
  });

  it('shows an idea with its many channel/format variants', async () => {
    render(<App initialView="content" />);
    const card = await screen.findByRole('region', {
      name: /Street trees cool low-income neighbourhoods least/i,
    });
    const rows = within(card).getAllByTestId('variant-row');
    expect(rows.length).toBe(3);
    expect(within(card).getByText(/linkedin · post/i)).toBeInTheDocument();
    expect(within(card).getByText(/bluesky · thread/i)).toBeInTheDocument();
  });

  it('publishes a cleared variant (status → exported)', async () => {
    render(<App initialView="content" />);
    const card = await screen.findByRole('region', { name: /Street trees/i });
    const liRow = within(card).getByText(/linkedin · post/i).closest('[data-testid="variant-row"]')!;
    const row = within(liRow as HTMLElement);

    fireEvent.click(row.getByRole('button', { name: /Publish/i }));
    await waitFor(() => expect(row.getByTestId('variant-status').textContent).toMatch(/exported/i));
  });

  it('disables Publish for a not-cleared variant', async () => {
    render(<App initialView="content" />);
    const card = await screen.findByRole('region', { name: /Street trees/i });
    const nlRow = within(card)
      .getByText(/newsletter · newsletter-paragraph/i)
      .closest('[data-testid="variant-row"]')!;
    const publish = within(nlRow as HTMLElement).getByRole('button', { name: /Publish/i });
    expect(publish).toBeDisabled();
  });
});
