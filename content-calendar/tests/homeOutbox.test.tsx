import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('button', { name: /Outbox →/ }));
    expect(onNavigate).toHaveBeenCalledWith('outbox');
  });
});

describe('Outbox', () => {
  beforeEach(reset);

  it('groups posts by published / scheduled / failed with links and reasons', () => {
    useStore.setState({
      posts: [
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

    const failed = within(screen.getByLabelText('Failed'));
    expect(failed.getByText('oops')).toBeInTheDocument();
    expect(failed.getByText(/No connected bluesky account/)).toBeInTheDocument();
  });

  it('shows empty-state copy when there is nothing in a group', () => {
    render(<OutboxScreen />);
    expect(screen.getByText(/Nothing published yet/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing failed/)).toBeInTheDocument();
  });
});
