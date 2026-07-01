import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HomeScreen } from '../src/components/HomeScreen';
import { __setPersistence, useStore } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { LocalSourcesClient, setSourcesClient } from '../src/sources/sourcesClient';
import { resetSourceMeta, setSourceStatus } from '../src/sources/sourceMeta';
import type { Source } from '../src/sources/sourcesTypes';
import type { Post } from '../src/types';

const SOURCES: Source[] = [
  {
    id: 'src_trees',
    kind: 'paper',
    title: 'Street trees and urban heat',
    abstract: 'Tree cover was associated with cooler streets.',
    tags: ['urban'],
    importedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'src_sleep',
    kind: 'note',
    title: 'Sleep and memory',
    body: 'memory consolidation',
    tags: ['neuro'],
    importedAt: '2026-01-01T00:00:00.000Z',
  },
];

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

function reset() {
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  setSourcesClient(new LocalSourcesClient(SOURCES));
  resetSourceMeta({});
  useStore.setState({ posts: [], accounts: [] });
}

describe('Home dashboard', () => {
  beforeEach(reset);

  it('counts drafts needing review and links to the review queue', async () => {
    useStore.setState({
      posts: [
        post({ id: 'p_review', status: 'review', body: 'Findings under review' }),
        post({ id: 'p_draft', status: 'draft', body: 'Still drafting' }),
        post({ id: 'p_pub', status: 'published', body: 'Already out' }),
      ],
    });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} />);

    const section = within(screen.getByLabelText('Needs your review'));
    expect(section.getByText('2')).toBeInTheDocument();
    expect(section.getByText('Findings under review')).toBeInTheDocument();

    fireEvent.click(section.getByRole('button', { name: /Review queue →/ }));
    expect(onNavigate).toHaveBeenCalledWith('review');
  });

  it('shows a blocking safety callout when a draft trips a block-severity finding', () => {
    useStore.setState({
      posts: [
        post({ id: 'p_bad', status: 'draft', body: 'This treatment cures the disease.' }),
        post({ id: 'p_ok', status: 'review', body: 'A careful summary of the study.' }),
      ],
    });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} />);

    const callout = screen.getByTestId('safety-blocks');
    expect(callout).toHaveTextContent('1 draft has blocking safety findings');
    fireEvent.click(within(callout).getByRole('button', { name: /Review →/ }));
    expect(onNavigate).toHaveBeenCalledWith('review');
  });

  it('hides the safety callout when no draft is blocked', () => {
    useStore.setState({
      posts: [post({ id: 'p_ok', status: 'review', body: 'A careful summary.' })],
    });
    render(<HomeScreen onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('safety-blocks')).not.toBeInTheDocument();
  });

  it('lists recent sources and counts sources waiting to be reused', async () => {
    setSourceStatus('src_trees', 'used');
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} />);

    const sources = within(await screen.findByLabelText('Recent sources'));
    expect(sources.getByText('Street trees and urban heat')).toBeInTheDocument();
    expect(sources.getByText('Sleep and memory')).toBeInTheDocument();
    // src_trees is used; src_sleep defaults to 'new' → one source still waiting.
    expect(sources.getByText(/1 source waiting to be reused/)).toBeInTheDocument();

    fireEvent.click(sources.getByRole('button', { name: /Source Inbox →/ }));
    expect(onNavigate).toHaveBeenCalledWith('inbox');
  });

  it('shows the ready-to-publish counts with outbox and calendar links', () => {
    useStore.setState({
      posts: [
        post({ id: 'p_appr', status: 'approved' }),
        post({ id: 'p_sch', status: 'scheduled' }),
        post({ id: 'p_sch2', status: 'scheduled' }),
      ],
    });
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} />);

    const ready = within(screen.getByLabelText('Ready to publish'));
    expect(ready.getByText(/1 approved post/)).toBeInTheDocument();
    expect(ready.getByText(/2 scheduled/)).toBeInTheDocument();

    fireEvent.click(ready.getByRole('button', { name: /Publish queue →/ }));
    expect(onNavigate).toHaveBeenCalledWith('outbox');
    fireEvent.click(ready.getByRole('button', { name: /Calendar →/ }));
    expect(onNavigate).toHaveBeenCalledWith('calendar');
  });
});
