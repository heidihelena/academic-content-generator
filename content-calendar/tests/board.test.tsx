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
    // The paper-launch post is seeded in the Learn stage.
    const learn = screen.getByTestId('board-column-learn');
    expect(within(learn).getByText(/urban tree canopy/i)).toBeInTheDocument();
  });

  it('moves a card to a new stage when dropped on a column', () => {
    render(<App />);
    const post = useStore.getState().posts.find((p) => p.body.includes('urban tree canopy'))!;
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

describe('Review/Approve gate', () => {
  beforeEach(resetStore);

  function openReviewPost() {
    render(<App />);
    const post = useStore.getState().posts.find((p) => p.status === 'review')!;
    fireEvent.click(screen.getByTestId(`post-card-${post.id}`));
    return post;
  }

  it('shows the review panel only for posts in Review', () => {
    render(<App />);
    // A drafting post has no review panel.
    const draftPost = useStore.getState().posts.find((p) => p.status === 'draft')!;
    fireEvent.click(screen.getByTestId(`post-card-${draftPost.id}`));
    expect(screen.queryByTestId('review-panel')).not.toBeInTheDocument();
  });

  it('approves a post → moves it to Approved and logs the decision', () => {
    const post = openReviewPost();
    expect(screen.getByTestId('review-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));

    const updated = useStore.getState().posts.find((p) => p.id === post.id)!;
    expect(updated.status).toBe('approved');
    const lastReview = updated.reviews?.[updated.reviews.length - 1];
    expect(lastReview?.decision).toBe('approved');
    // Editor closes after the decision.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requests changes → sends the post back to Drafting with a note', () => {
    const post = openReviewPost();
    fireEvent.click(screen.getByRole('button', { name: /Request changes/i }));
    fireEvent.change(screen.getByLabelText(/What needs to change/i), {
      target: { value: 'Sharpen the CTA' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send back to Drafting/i }));

    const updated = useStore.getState().posts.find((p) => p.id === post.id)!;
    expect(updated.status).toBe('draft');
    const last = updated.reviews?.[updated.reviews.length - 1];
    expect(last?.decision).toBe('changes_requested');
    expect(last?.note).toBe('Sharpen the CTA');
  });
});
