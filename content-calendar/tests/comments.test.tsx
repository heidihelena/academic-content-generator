import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommentsSection } from '../src/components/CommentsSection';
import { LocalContentClient, setContentClient } from '../src/content/contentClient';
import type { CommentEntry, ContentClient } from '../src/content/contentTypes';

beforeEach(() => vi.useRealTimers());

describe('LocalContentClient comments', () => {
  it('adds and lists comments oldest first, scoped to the item', async () => {
    const client = new LocalContentClient();
    const items = await client.listItems();
    const a = items[0].id;
    const b = items[1].id;
    await client.addComment(a, 'First');
    await client.addComment(a, 'Second');
    await client.addComment(b, 'Other item');

    const list = await client.listComments(a);
    expect(list.map((c) => c.body)).toEqual(['First', 'Second']);
    expect(await client.listComments(b)).toHaveLength(1);
  });

  it('throws for a missing item', async () => {
    const client = new LocalContentClient();
    await expect(client.addComment('ci_nope', 'hi')).rejects.toThrow();
  });
});

describe('CommentsSection', () => {
  function stub(over: Partial<ContentClient> = {}): ContentClient {
    return {
      name: 'stub',
      listComments: () => Promise.resolve([] as CommentEntry[]),
      addComment: (itemId: string, body: string) =>
        Promise.resolve({ id: 'cm_1', itemId, body, createdAt: '2026-06-20T00:00:00.000Z' }),
      ...over,
    } as unknown as ContentClient;
  }

  it('adds a comment and shows it', async () => {
    setContentClient(stub());
    render(<CommentsSection itemId="ci_1" />);
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Add a comment'), { target: { value: 'Needs a citation' } });
    fireEvent.click(screen.getByText('Comment'));

    expect(await screen.findByText('Needs a citation')).toBeInTheDocument();
  });

  it('renders existing comments on open', async () => {
    setContentClient(
      stub({
        listComments: () =>
          Promise.resolve([
            { id: 'cm_x', itemId: 'ci_1', author: 'alice', body: 'Looks good', createdAt: '2026-06-19T00:00:00.000Z' },
          ]),
      }),
    );
    render(<CommentsSection itemId="ci_1" />);
    expect(await screen.findByText('Looks good')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });
});
