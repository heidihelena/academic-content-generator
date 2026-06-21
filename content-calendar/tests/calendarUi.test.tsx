import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import type { Post } from '../src/types';

function resetStore() {
  __setPersistence(new MemoryPersistence());
  useStore.setState({
    posts: [],
    accounts: [],
    view: 'week',
    platformFilter: 'all',
    statusFilter: 'all',
    searchQuery: '',
    editingPostId: null,
    isEditorOpen: false,
    draggingId: null,
    selectedIds: [],
    accountBusy: {},
    accountError: {},
    weekAnchor: new Date().toISOString(),
  });
}

describe('ViewSwitcher + DateNavigator', () => {
  beforeEach(resetStore);

  it('switches between week, month and day views', () => {
    render(<App initialView="calendar" />);
    // Default week view.
    expect(screen.getByTestId('week-range')).toHaveTextContent('Jun 15 – 21, 2026');

    fireEvent.click(screen.getByRole('button', { name: 'month' }));
    expect(screen.queryByTestId('week-range')).not.toBeInTheDocument();
    expect(screen.getByTestId('date-range')).toHaveTextContent('June 2026');
    expect(screen.getByTestId('month-grid')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'day' }));
    expect(screen.getByTestId('date-range')).toHaveTextContent('Jun 17, 2026');

    fireEvent.click(screen.getByRole('button', { name: 'week' }));
    expect(screen.getByTestId('week-range')).toBeInTheDocument();
  });
});

describe('SearchBar', () => {
  beforeEach(resetStore);

  it('filters posts by caption text', () => {
    render(<App initialView="calendar" />);
    expect(screen.getByText(/Monday motivation/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search posts'), { target: { value: 'analyzed' } });
    expect(screen.getByText(/We analyzed 10,000 B2B posts/i)).toBeInTheDocument();
    expect(screen.queryByText(/Monday motivation/i)).not.toBeInTheDocument();
  });
});

describe('Bulk selection', () => {
  beforeEach(resetStore);

  it('selects posts and bulk-deletes them', () => {
    render(<App initialView="calendar" />);
    const before = useStore.getState().posts.length;
    const checkboxes = screen.getAllByLabelText('Select post');

    fireEvent.click(checkboxes[0]);
    expect(screen.getByTestId('bulk-count')).toHaveTextContent('1 selected');
    fireEvent.click(checkboxes[1]);
    expect(screen.getByTestId('bulk-count')).toHaveTextContent('2 selected');

    const bar = screen.getByRole('toolbar', { name: 'Bulk actions' });
    fireEvent.click(within(bar).getByRole('button', { name: /Delete/i }));

    expect(useStore.getState().posts).toHaveLength(before - 2);
    expect(useStore.getState().selectedIds).toEqual([]);
    expect(screen.queryByTestId('bulk-count')).not.toBeInTheDocument();
  });

  it('bulk-sets status on selected posts', () => {
    render(<App initialView="calendar" />);
    const checkboxes = screen.getAllByLabelText('Select post');
    fireEvent.click(checkboxes[0]);
    const bar = screen.getByRole('toolbar', { name: 'Bulk actions' });
    fireEvent.change(within(bar).getByLabelText('Set status for selected'), {
      target: { value: 'published' },
    });
    // Selection clears and at least one post is now published.
    expect(useStore.getState().selectedIds).toEqual([]);
    expect(useStore.getState().posts.some((p) => p.status === 'published')).toBe(true);
  });
});

describe('ConflictWarningModal', () => {
  beforeEach(resetStore);

  function conflictingPost(id: string, hhmm: string): Post {
    const now = new Date();
    const [h, m] = hhmm.split(':').map(Number);
    now.setHours(h, m, 0, 0);
    return {
      id,
      platform: 'instagram',
      body: `Scheduled item ${id}`,
      scheduledAt: now.toISOString(),
      status: 'scheduled',
      media: [],
      createdAt: '',
      updatedAt: '',
    };
  }

  it('surfaces a conflict badge and lists conflicts', () => {
    render(<App initialView="calendar" />);
    // Replace seeded data (App.initialize runs on mount) with two conflicting posts.
    act(() => {
      useStore.setState({
        posts: [conflictingPost('c1', '09:00'), conflictingPost('c2', '09:15')],
      });
    });

    const badge = screen.getByRole('button', { name: /conflict/i });
    expect(badge).toBeInTheDocument();
    fireEvent.click(badge);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Scheduling conflicts');
    expect(within(dialog).getByText(/15 min apart/i)).toBeInTheDocument();
  });
});
