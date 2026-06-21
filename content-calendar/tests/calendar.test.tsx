import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
    editingPostId: null,
    isEditorOpen: false,
    accountBusy: {},
    accountError: {},
    weekAnchor: new Date().toISOString(),
  });
}

/** A minimal DataTransfer stand-in for jsdom drag-and-drop events. */
function makeDataTransfer(payload = '') {
  let data = payload;
  return {
    setData: (_type: string, value: string) => {
      data = value;
    },
    getData: () => data,
    effectAllowed: 'move',
    dropEffect: 'move',
  } as unknown as DataTransfer;
}

describe('WeeklyCalendar rendering & filtering', () => {
  beforeEach(resetStore);

  it('renders the current week range and seeded posts', () => {
    render(<App initialView="calendar" />);
    expect(screen.getByTestId('week-range')).toHaveTextContent('Jun 15 – 21, 2026');
    // A known seeded caption is visible on the calendar.
    expect(screen.getByText(/Monday motivation/i)).toBeInTheDocument();
  });

  it('renders 7 day columns', () => {
    render(<App initialView="calendar" />);
    const cells = screen.getAllByTestId(/^day-cell-/);
    expect(cells).toHaveLength(7);
  });

  it('filters posts by platform', () => {
    render(<App initialView="calendar" />);
    // Initially a LinkedIn-only caption is present.
    expect(screen.getByText(/We analyzed 10,000 B2B posts/i)).toBeInTheDocument();

    // Filter to Instagram only -> the LinkedIn post disappears.
    fireEvent.click(screen.getByRole('button', { name: 'Instagram', pressed: false }));
    expect(screen.queryByText(/We analyzed 10,000 B2B posts/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Monday motivation/i)).toBeInTheDocument();
  });

  it('filters posts by status', () => {
    render(<App initialView="calendar" />);
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'failed' } });
    // Only the failed LinkedIn experiment should remain.
    expect(screen.getByText(/Scheduling experiment/i)).toBeInTheDocument();
    expect(screen.queryByText(/Monday motivation/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when filters match nothing', () => {
    render(<App initialView="calendar" />);
    // Threads + published: no seeded post matches this combination.
    fireEvent.click(screen.getByRole('button', { name: 'Threads', pressed: false }));
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'published' } });
    expect(screen.getByText(/No posts match these filters/i)).toBeInTheDocument();
  });

  it('navigates between weeks', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByTestId('week-range')).toHaveTextContent('Jun 22 – 28, 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByTestId('week-range')).toHaveTextContent('Jun 15 – 21, 2026');
  });

  it('reschedules a post via drag-and-drop', () => {
    render(<App initialView="calendar" />);
    // Grab the published Monday post and move it to Sunday (day-cell-0).
    const post = useStore.getState().posts.find((p) => p.body.includes('Monday motivation'))!;
    const card = screen.getByTestId(`post-card-${post.id}`);
    const sundayCell = screen.getByTestId('day-cell-0'); // getDay() === 0 -> Sunday

    const dt = makeDataTransfer();
    fireEvent.dragStart(card, { dataTransfer: dt });
    fireEvent.dragOver(sundayCell, { dataTransfer: dt });
    fireEvent.drop(sundayCell, { dataTransfer: dt });

    const moved = useStore.getState().posts.find((p) => p.id === post.id)!;
    expect(new Date(moved.scheduledAt).getDay()).toBe(0);
    // The card now lives inside the Sunday column.
    expect(within(sundayCell).getByTestId(`post-card-${post.id}`)).toBeInTheDocument();
  });
});
