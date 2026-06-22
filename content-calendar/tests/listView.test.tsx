import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

function resetStore() {
  __setPersistence(new MemoryPersistence());
  useStore.setState({
    posts: [],
    accounts: [],
    platformFilter: 'all',
    statusFilter: 'all',
    searchQuery: '',
    editingPostId: null,
    isEditorOpen: false,
    accountBusy: {},
    accountError: {},
    weekAnchor: new Date().toISOString(),
  });
}

describe('ListView', () => {
  beforeEach(resetStore);

  it('renders a row per seeded post', () => {
    render(<App initialView="list" />);
    const rows = screen.getAllByTestId(/^list-row-/);
    expect(rows.length).toBe(useStore.getState().posts.length);
  });

  it('opens the editor when a row is clicked', () => {
    render(<App initialView="list" />);
    fireEvent.click(screen.getAllByTestId(/^list-row-/)[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit post')).toBeInTheDocument();
  });

  it('filters rows by search query', () => {
    render(<App initialView="list" />);
    fireEvent.change(screen.getByLabelText('Search posts'), { target: { value: 'plain language' } });
    const rows = screen.getAllByTestId(/^list-row-/);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(/plain language/i);
  });

  it('toggles date sort order', () => {
    render(<App initialView="list" />);
    const firstAsc = screen.getAllByTestId(/^list-row-/)[0].getAttribute('data-testid');
    fireEvent.click(screen.getByRole('button', { name: /Sort by date/i }));
    const firstDesc = screen.getAllByTestId(/^list-row-/)[0].getAttribute('data-testid');
    expect(firstDesc).not.toBe(firstAsc);
  });
});
