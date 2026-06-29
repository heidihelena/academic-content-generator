import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

function resetStore() {
  vi.useRealTimers(); // the planner is async; assert via findBy*/waitFor
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

const TRANSCRIPT = [
  '0:00 Welcome back to the channel',
  '0:25 We found that urban trees cool poorer streets far less than wealthy ones',
  '1:00 The surprising result is a two degree heat gap across one city',
  '1:45 Why this matters for public health and what councils should do',
].join('\n');

describe('Video → Shorts plan', () => {
  beforeEach(resetStore);

  it('plans shorts and adds them to Drafting as YouTube posts', async () => {
    render(<App initialView="ideas" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Video → shorts' }));

    fireEvent.change(screen.getByLabelText('YouTube URL (optional)'), {
      target: { value: 'https://youtu.be/abc' },
    });
    fireEvent.change(screen.getByLabelText(/Transcript/i), { target: { value: TRANSCRIPT } });
    fireEvent.click(screen.getByRole('button', { name: /Plan shorts/i }));

    const plan = await screen.findByTestId('shorts-plan', {}, { timeout: 2000 });
    const items = within(plan).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);

    const before = useStore.getState().posts.length;
    fireEvent.click(screen.getByRole('button', { name: /Add to Drafting/i }));

    await waitFor(() => expect(screen.getByTestId('shorts-added')).toBeInTheDocument());
    const created = useStore.getState().posts.slice(before);
    expect(created.length).toBe(items.length);
    expect(created.every((p) => p.platform === 'youtube')).toBe(true);
    expect(created.every((p) => p.status === 'draft')).toBe(true);
    // The video deep-link with a start time is embedded in the body.
    expect(created.some((p) => /youtu\.be\/abc.*t=\d+s/.test(p.body))).toBe(true);
  });

  it('shows an error for an empty transcript', async () => {
    render(<App initialView="ideas" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Video → shorts' }));
    fireEvent.click(screen.getByRole('button', { name: /Plan shorts/i }));
    expect(await screen.findByText(/Paste a transcript/i)).toBeInTheDocument();
  });

  it('reveals an ffmpeg render recipe for a timestamped clip', async () => {
    render(<App initialView="ideas" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Video → shorts' }));
    fireEvent.change(screen.getByLabelText('YouTube URL (optional)'), {
      target: { value: 'https://youtu.be/abc' },
    });
    fireEvent.change(screen.getByLabelText(/Transcript/i), { target: { value: TRANSCRIPT } });
    fireEvent.click(screen.getByRole('button', { name: /Plan shorts/i }));

    await screen.findByTestId('shorts-plan');
    fireEvent.click(screen.getAllByRole('button', { name: /Render recipe/i })[0]);

    const recipe = screen.getByTestId('clip-recipe');
    expect(recipe).toHaveTextContent(/ffmpeg .*crop=1080:1920/);
    expect(recipe).toHaveTextContent(/yt-dlp/); // URL provided ⇒ download step included
  });

  it('falls back to manual paste when transcript fetch is unavailable (no backend)', async () => {
    render(<App initialView="ideas" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Video → shorts' }));
    fireEvent.change(screen.getByLabelText('YouTube URL (optional)'), {
      target: { value: 'https://youtu.be/dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Fetch transcript/i }));
    // With no VITE_API_URL configured in tests, it guides the user to paste.
    expect(await screen.findByTestId('fetch-error')).toHaveTextContent(/paste/i);
  });
});
