import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import type { Post } from '../src/types';

function post(overrides: Partial<Post> = {}): Post {
  const now = new Date();
  now.setHours(9, 0, 0, 0);
  return {
    id: 'rp1',
    platform: 'linkedin',
    body: 'Big result here',
    scheduledAt: now.toISOString(),
    status: 'draft',
    media: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function seed(posts: Post[]) {
  // Persist so App.initialize() (which reloads from the data source) keeps them.
  const persistence = new MemoryPersistence();
  persistence.save({ posts, accounts: [] });
  __setPersistence(persistence);
  useStore.setState({
    posts,
    accounts: [],
    platformFilter: 'all',
    statusFilter: 'all',
    searchQuery: '',
    editingPostId: null,
    isEditorOpen: false,
    accountBusy: {},
    accountError: {},
    weekAnchor: new Date().toISOString(),
  });
}

describe('Reach indicator on cards', () => {
  beforeEach(() => seed([]));

  it('flags a LinkedIn post with a link in the body on the calendar card', () => {
    const p = post({ body: 'Our paper is out https://doi.org/10.1/x' });
    seed([p]);
    render(<App initialView="calendar" />);
    expect(screen.getByTestId(`reach-warn-${p.id}`)).toBeInTheDocument();
  });

  it('shows no reach flag for a clean post', () => {
    const p = post({ id: 'clean1', body: 'A short, clear finding in plain words.' });
    seed([p]);
    render(<App initialView="calendar" />);
    expect(screen.queryByTestId(`reach-warn-${p.id}`)).not.toBeInTheDocument();
  });

  it('flags the post in the List view too', () => {
    const p = post({ id: 'lr1', body: 'Read it https://doi.org/10.1/x #a #b #c #d #e #f' });
    seed([p]);
    render(<App initialView="list" />);
    expect(screen.getByTestId(`list-reach-warn-${p.id}`)).toBeInTheDocument();
  });

  it('does not flag a published post (reach is moot once it is out)', () => {
    const p = post({ id: 'pub1', status: 'published', body: 'Our paper https://doi.org/10.1/x' });
    seed([p]);
    render(<App initialView="calendar" />);
    expect(screen.queryByTestId(`reach-warn-${p.id}`)).not.toBeInTheDocument();
  });
});
