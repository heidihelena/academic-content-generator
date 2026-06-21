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

describe('PipelineBoard', () => {
  beforeEach(resetStore);

  it('is the default view and renders a column per pipeline stage', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Pipeline board' })).toBeInTheDocument();
    for (const status of ['brief', 'draft', 'review', 'approved', 'scheduled', 'published', 'learn']) {
      expect(screen.getByTestId(`board-column-${status}`)).toBeInTheDocument();
    }
  });

  it('places a seeded post in its stage column', () => {
    render(<App />);
    // "Monday motivation" is seeded in the Learn stage.
    const learn = screen.getByTestId('board-column-learn');
    expect(within(learn).getByText(/Monday motivation/i)).toBeInTheDocument();
  });

  it('moves a card to a new stage when dropped on a column', () => {
    render(<App />);
    const post = useStore.getState().posts.find((p) => p.body.includes('Monday motivation'))!;
    expect(post.status).toBe('learn');

    const card = screen.getByTestId(`post-card-${post.id}`);
    const reviewColumn = screen.getByTestId('board-column-review');

    const dt = makeDataTransfer();
    fireEvent.dragStart(card, { dataTransfer: dt });
    fireEvent.dragOver(reviewColumn, { dataTransfer: dt });
    fireEvent.drop(reviewColumn, { dataTransfer: dt });

    expect(useStore.getState().posts.find((p) => p.id === post.id)!.status).toBe('review');
    expect(within(reviewColumn).getByTestId(`post-card-${post.id}`)).toBeInTheDocument();
  });

  it('creates a brief from the "New brief" action', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /New brief/i }));
    // The editor opens defaulting to the Brief stage.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect((screen.getByLabelText('Stage') as HTMLSelectElement).value).toBe('brief');
  });
});
