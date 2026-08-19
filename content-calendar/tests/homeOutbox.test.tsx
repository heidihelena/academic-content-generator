import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../src/App';
import { HomeScreen } from '../src/components/HomeScreen';
import { OutboxScreen } from '../src/components/OutboxScreen';
import { __setPersistence, useStore } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import type { Post } from '../src/types';

function reset() {
  __setPersistence(new MemoryPersistence());
  useStore.setState({ posts: [], accounts: [] });
  window.location.hash = '';
}

const post = (over: Partial<Post>): Post => ({
  id: Math.random().toString(36).slice(2),
  platform: 'bluesky',
  body: 'hello',
  scheduledAt: '2026-07-01T09:00:00.000Z',
  status: 'draft',
  media: [],
  createdAt: '2026-06-29T00:00:00.000Z',
  updatedAt: '2026-06-29T00:00:00.000Z',
  ...over,
});

describe('Home', () => {
  beforeEach(reset);

  it('is the default landing screen', () => {
    render(<App />);
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('checks off a step that is already done and routes from an unfinished one', () => {
    useStore.setState({
      accounts: [{ platform: 'bluesky', status: 'connected' }],
      posts: [],
    });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} />);

    // "Connect a publishing account" is done → no CTA; "Publish your first post" isn't.
    fireEvent.click(screen.getByRole('button', { name: 'Outbox →' }));
    expect(onNavigate).toHaveBeenCalledWith('outbox');
  });
});

describe('Outbox', () => {
  beforeEach(reset);

  it('groups posts by published / scheduled / failed with links and reasons', () => {
    useStore.setState({
      accounts: [{ platform: 'bluesky', status: 'connected' }],
      posts: [
        post({ id: 'p_ready', status: 'approved', body: 'ready' }),
        post({ id: 'p_pub', status: 'published', permalink: 'https://x.com/i/web/status/1', body: 'shipped' }),
        post({ id: 'p_sch', status: 'scheduled', body: 'queued' }),
        post({ id: 'p_fail', status: 'failed', statusDetail: 'No connected bluesky account', body: 'oops' }),
      ],
    });
    render(<OutboxScreen />);

    const published = within(screen.getByLabelText('Published'));
    expect(published.getByText('shipped')).toBeInTheDocument();
    expect(published.getByRole('link', { name: /view post/i })).toHaveAttribute(
      'href',
      'https://x.com/i/web/status/1',
    );

    expect(within(screen.getByLabelText('Scheduled')).getByText('queued')).toBeInTheDocument();

    const ready = within(screen.getByLabelText('Ready to post'));
    expect(ready.getByText('ready')).toBeInTheDocument();
    fireEvent.click(ready.getByRole('button', { name: /Schedule/i }));
    expect(useStore.getState().posts.find((p) => p.id === 'p_ready')?.status).toBe('approved');

    const dialog = screen.getByRole('dialog', { name: /Schedule post/i });
    expect(within(dialog).getByLabelText('Date and time')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Date and time'), {
      target: { value: '2026-07-02T14:30' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm schedule/i }));
    expect(useStore.getState().posts.find((p) => p.id === 'p_ready')?.status).toBe('scheduled');
    expect(useStore.getState().posts.find((p) => p.id === 'p_ready')?.scheduledAt).toBe(
      new Date('2026-07-02T14:30').toISOString(),
    );

    const failed = within(screen.getByLabelText('Failed'));
    expect(failed.getByText('oops')).toBeInTheDocument();
    expect(failed.getByText(/No connected bluesky account/)).toBeInTheDocument();
  });

  it('offers a start CTA when the outbox is completely empty', () => {
    render(<OutboxScreen />);
    expect(screen.getByText(/Nothing here yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Draft Studio/i })).toBeInTheDocument();
  });

  it('shows per-group empty copy once some posts exist', () => {
    useStore.setState({
      accounts: [{ platform: 'bluesky', status: 'connected' }],
      posts: [post({ id: 'p_pub', status: 'published', body: 'shipped' })],
    });
    render(<OutboxScreen />);
    expect(screen.getByText(/Nothing approved yet/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing failed/)).toBeInTheDocument();
  });

  it('confirms before publishing and shows a success banner with the permalink', async () => {
    const publishPost = vi.fn(async (id: string) => {
      useStore.setState((s) => ({
        posts: s.posts.map((p) =>
          p.id === id
            ? { ...p, status: 'published' as const, permalink: 'https://bsky.app/p/1' }
            : p,
        ),
      }));
      return true;
    });
    useStore.setState({
      accounts: [{ platform: 'bluesky', status: 'connected' }],
      posts: [post({ id: 'p_ready', status: 'approved', body: 'ready' })],
      publishPost,
    });
    render(<OutboxScreen />);

    // Publishing is guarded by a confirmation — clicking does not post yet.
    fireEvent.click(within(screen.getByLabelText('Ready to post')).getByRole('button', { name: /Publish now/i }));
    expect(publishPost).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: /Publish now\?/i });
    expect(within(dialog).getByText(/posts publicly to Bluesky/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Publish now/i }));
      await vi.runAllTimersAsync();
    });
    const banner = screen.getByTestId('publish-success');
    expect(banner).toHaveTextContent(/Published to Bluesky/i);
    expect(within(banner).getByRole('link', { name: /View post/i })).toHaveAttribute('href', 'https://bsky.app/p/1');
    expect(publishPost).toHaveBeenCalledWith('p_ready');
  });

  it('shows the failure at the point of action when a publish fails', async () => {
    const publishPost = vi.fn(async () => {
      useStore.setState({ publishError: 'Bluesky session expired — reconnect the account.' });
      return false;
    });
    useStore.setState({
      accounts: [{ platform: 'bluesky', status: 'connected' }],
      posts: [post({ id: 'p_ready', status: 'approved', body: 'ready' })],
      publishPost,
    });
    render(<OutboxScreen />);
    fireEvent.click(within(screen.getByLabelText('Ready to post')).getByRole('button', { name: /Publish now/i }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Publish now/i }));
      await vi.runAllTimersAsync();
    });
    expect(screen.getByTestId('publish-error')).toHaveTextContent(/session expired/i);
  });

  it('tells the user to connect the account before publishing is possible', () => {
    useStore.setState({
      accounts: [{ platform: 'bluesky', status: 'disconnected' }],
      posts: [post({ id: 'p_ready', status: 'approved', platform: 'bluesky', body: 'ready' })],
    });
    render(<OutboxScreen />);
    const banner = screen.getByTestId('connect-first');
    expect(banner).toHaveTextContent(/Connect Bluesky before you can publish/i);
    fireEvent.click(within(banner).getByRole('button', { name: /Connections/i }));
    expect(window.location.hash).toBe('#/connections');
  });
});
