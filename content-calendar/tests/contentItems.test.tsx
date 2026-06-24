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

describe('Content view + editor drawer', () => {
  beforeEach(() => {
    resetStore();
    setContentClient(new LocalContentClient()); // fresh sample data per test
  });

  it('shows an idea with its many channel/format variants', async () => {
    render(<App initialView="content" />);
    const card = await screen.findByRole('region', { name: /Street trees/i });
    expect(within(card).getAllByTestId('variant-row')).toHaveLength(3);
  });

  it('opens a variant in the side drawer and exports a cleared one', async () => {
    render(<App initialView="content" />);
    const sleep = await screen.findByRole('region', { name: /Slow-wave sleep/i });
    fireEvent.click(within(sleep).getByTestId('variant-row'));

    const drawer = await screen.findByRole('dialog', { name: /teaching · slide/i });
    const exportBtn = within(drawer).getByRole('button', { name: /^Export/ });
    expect(exportBtn).not.toBeDisabled(); // sample is safety-cleared + human-reviewed

    fireEvent.click(exportBtn);
    await waitFor(() => expect(within(drawer).getByText('exported')).toBeInTheDocument());
  });

  it('runs the safety review and blocks export with reasons for an overclaim', async () => {
    render(<App initialView="content" />);
    const trees = await screen.findByRole('region', { name: /Street trees/i });
    const patientRow = within(trees)
      .getByText(/newsletter · newsletter-paragraph/i)
      .closest('[data-testid="variant-row"]')!;
    fireEvent.click(patientRow as HTMLElement);

    const drawer = await screen.findByRole('dialog', { name: /newsletter/i });
    fireEvent.click(within(drawer).getByRole('button', { name: /Run medical safety review/i }));

    await waitFor(() =>
      expect(within(drawer).getByTestId('findings').textContent).toMatch(/cure|guarantee/i),
    );
    expect(within(drawer).getByTestId('export-blockers').textContent).toMatch(/blocking safety finding/i);
    expect(within(drawer).getByRole('button', { name: /^Export/ })).toBeDisabled();
  });
});
