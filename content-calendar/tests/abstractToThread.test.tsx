import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

function resetStore() {
  // The drafter is async and we assert via findBy*/waitFor (real-timer polling).
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

const ABSTRACT =
  'In this study, we examined how street trees affect urban heat. ' +
  'We found that low-income neighbourhoods were 2°C hotter than wealthy ones. ' +
  'Tree cover was strongly associated with cooler streets. ' +
  'These results suggest that tree-planting policy should target equity.';

describe('Abstract → thread', () => {
  beforeEach(resetStore);

  it('drafts a thread from an abstract and adds it to Drafting', async () => {
    render(<App initialView="ideas" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Abstract → thread' }));

    fireEvent.change(screen.getByLabelText('Abstract'), { target: { value: ABSTRACT } });
    fireEvent.change(screen.getByLabelText('Source link (optional)'), {
      target: { value: 'https://doi.org/10.1/x' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Draft thread/i }));

    const preview = await screen.findByTestId('thread-preview', {}, { timeout: 2000 });
    const items = within(preview).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(1);

    const before = useStore.getState().posts.length;
    fireEvent.click(screen.getByRole('button', { name: /Add to Drafting/i }));

    await waitFor(() => expect(screen.getByTestId('thread-added')).toBeInTheDocument());
    const after = useStore.getState().posts;
    expect(after.length).toBe(before + items.length);
    // The newly-appended posts are bluesky drafts within the 300-char limit.
    const created = after.slice(before);
    expect(created.every((p) => p.platform === 'bluesky')).toBe(true);
    expect(created.every((p) => p.status === 'draft')).toBe(true);
    expect(created.every((p) => p.body.length <= 300)).toBe(true);
  });

  it('surfaces an error for an empty abstract', async () => {
    render(<App initialView="ideas" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Abstract → thread' }));
    fireEvent.click(screen.getByRole('button', { name: /Draft thread/i }));
    expect(await screen.findByText(/Paste an abstract/i)).toBeInTheDocument();
  });
});
