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

describe('PostEditorModal', () => {
  beforeEach(resetStore);

  it('opens when a post card is clicked and shows its content', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Monday motivation/i));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Edit post')).toBeInTheDocument();
    // The caption textarea is pre-filled with the post being edited.
    expect((screen.getByLabelText('Caption') as HTMLTextAreaElement).value).toMatch(
      /Monday motivation/,
    );
  });

  it('updates the character count as the caption changes', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    const caption = screen.getByLabelText('Caption');
    fireEvent.change(caption, { target: { value: 'Hello world' } });
    expect(screen.getByTestId('char-count')).toHaveTextContent('11 / 2200');
  });

  it('warns and blocks saving when over the platform character limit', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    // Switch to Threads (500 char limit) then exceed it. Scope to the dialog so
    // we don't match the calendar's Threads filter button underneath.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Threads/i }));
    const caption = screen.getByLabelText('Caption');
    fireEvent.change(caption, { target: { value: 'x'.repeat(501) } });
    expect(screen.getByTestId('char-count')).toHaveTextContent('501 / 500');
    expect(screen.getByText(/exceeds the Threads limit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save post/i })).toBeDisabled();
  });

  it('saves an edited caption back to the store', () => {
    render(<App />);
    const original = useStore.getState().posts.find((p) => p.body.includes('Monday motivation'))!;
    fireEvent.click(screen.getByText(/Monday motivation/i));
    const caption = screen.getByLabelText('Caption');
    fireEvent.change(caption, { target: { value: 'Updated Monday caption' } });
    fireEvent.click(screen.getByRole('button', { name: /Save post/i }));

    const updated = useStore.getState().posts.find((p) => p.id === original.id)!;
    expect(updated.body).toBe('Updated Monday caption');
    // Modal closes after saving.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates a new post from the header action', () => {
    render(<App />);
    const before = useStore.getState().posts.length;
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'Fresh post' } });
    fireEvent.click(screen.getByRole('button', { name: /Save post/i }));
    const posts = useStore.getState().posts;
    expect(posts).toHaveLength(before + 1);
    expect(posts.some((p) => p.body === 'Fresh post')).toBe(true);
  });

  it('deletes a post from the editor', () => {
    render(<App />);
    const target = useStore.getState().posts.find((p) => p.body.includes('Monday motivation'))!;
    fireEvent.click(screen.getByText(/Monday motivation/i));
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(useStore.getState().posts.find((p) => p.id === target.id)).toBeUndefined();
  });

  it('saves owner and campaign with a new post and shows them on the card', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'Owned post' } });
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

  it('renders a live preview reflecting the caption', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'Preview me please' } });
    // The preview duplicates the caption text outside the textarea.
    const matches = screen.getAllByText(/Preview me please/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
