import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

describe('PostEditorModal', () => {
  beforeEach(resetStore);

  it('opens when a post card is clicked and shows its content', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByText(/urban tree canopy/i));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Edit post')).toBeInTheDocument();
    // The caption textarea is pre-filled with the post being edited.
    expect((screen.getByLabelText('Script / Copy') as HTMLTextAreaElement).value).toMatch(
      /urban tree canopy/,
    );
  });

  it('updates the character count as the caption changes', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    const caption = screen.getByLabelText('Script / Copy');
    fireEvent.change(caption, { target: { value: 'Hello world' } });
    expect(screen.getByTestId('char-count')).toHaveTextContent('11 / 2200');
  });

  it('warns and blocks saving when over the platform character limit', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    // Switch to Threads (500 char limit) then exceed it. Scope to the dialog so
    // we don't match the calendar's Threads filter button underneath.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Threads/i }));
    const caption = screen.getByLabelText('Script / Copy');
    fireEvent.change(caption, { target: { value: 'x'.repeat(501) } });
    expect(screen.getByTestId('char-count')).toHaveTextContent('501 / 500');
    expect(screen.getByText(/exceeds the Threads limit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save post/i })).toBeDisabled();
  });

  it('saves an edited caption back to the store', () => {
    render(<App initialView="calendar" />);
    const original = useStore.getState().posts.find((p) => p.body.includes('urban tree canopy'))!;
    fireEvent.click(screen.getByText(/urban tree canopy/i));
    const caption = screen.getByLabelText('Script / Copy');
    fireEvent.change(caption, { target: { value: 'Updated Monday caption' } });
    fireEvent.click(screen.getByRole('button', { name: /Save post/i }));

    const updated = useStore.getState().posts.find((p) => p.id === original.id)!;
    expect(updated.body).toBe('Updated Monday caption');
    // Modal closes after saving.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates a new post from the header action', () => {
    render(<App initialView="calendar" />);
    const before = useStore.getState().posts.length;
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Script / Copy'), { target: { value: 'Fresh post' } });
    fireEvent.click(screen.getByRole('button', { name: /Save post/i }));
    const posts = useStore.getState().posts;
    expect(posts).toHaveLength(before + 1);
    expect(posts.some((p) => p.body === 'Fresh post')).toBe(true);
  });

  it('deletes a post from the editor after confirming', () => {
    render(<App initialView="calendar" />);
    const target = useStore.getState().posts.find((p) => p.body.includes('urban tree canopy'))!;
    fireEvent.click(screen.getByText(/urban tree canopy/i));
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));

    // Deletion is guarded by a confirmation — the post is still there.
    expect(screen.getByText(/Delete this post\?/i)).toBeInTheDocument();
    expect(useStore.getState().posts.find((p) => p.id === target.id)).toBeDefined();

    // Confirm in the dialog.
    const dialog = screen.getByRole('dialog', { name: /Delete this post\?/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /Delete/i }));
    expect(useStore.getState().posts.find((p) => p.id === target.id)).toBeUndefined();
  });

  it('keeps the post when delete is cancelled', () => {
    render(<App initialView="calendar" />);
    const target = useStore.getState().posts.find((p) => p.body.includes('urban tree canopy'))!;
    fireEvent.click(screen.getByText(/urban tree canopy/i));
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));

    const dialog = screen.getByRole('dialog', { name: /Delete this post\?/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /Cancel/i }));
    expect(useStore.getState().posts.find((p) => p.id === target.id)).toBeDefined();
  });

  it('saves owner and campaign with a new post and shows them on the card', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Script / Copy'), { target: { value: 'Owned post' } });
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'Dana' } });
    fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: 'Launch Week' } });
    fireEvent.click(screen.getByRole('button', { name: /Save post/i }));

    const saved = useStore.getState().posts.find((p) => p.body === 'Owned post')!;
    expect(saved.owner).toBe('Dana');
    expect(saved.campaign).toBe('Launch Week');
    // Owner/campaign surface on the calendar card.
    expect(screen.getByText('Dana')).toBeInTheDocument();
    expect(screen.getByText('Launch Week')).toBeInTheDocument();
  });

  it('publishes only after confirming the public post', async () => {
    // Hydrate the sample data: a connected Bluesky account and Bluesky posts.
    act(() => {
      __setPersistence(new MemoryPersistence());
      useStore.getState().initialize();
    });
    const post = useStore.getState().posts.find((p) => p.platform === 'bluesky')!;

    render(<App initialView="calendar" />);
    act(() => useStore.getState().openEditor(post.id));

    // The footer offers Publish; clicking it opens a confirmation, not a post.
    fireEvent.click(screen.getByRole('button', { name: /Publish now/i }));
    expect(screen.getByText(/Publish now\?/i)).toBeInTheDocument();
    expect(useStore.getState().posts.find((p) => p.id === post.id)!.status).not.toBe('published');

    // Confirm "Post now" in the dialog → the real publish runs.
    const dialog = screen.getByRole('dialog', { name: /Publish now\?/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /Post now/i }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(useStore.getState().posts.find((p) => p.id === post.id)!.status).toBe('published');
  });

  it('renders a live preview reflecting the caption', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Script / Copy'), { target: { value: 'Preview me please' } });
    // The preview duplicates the caption text outside the textarea.
    const matches = screen.getAllByText(/Preview me please/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
