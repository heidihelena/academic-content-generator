import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusTimeline } from '../src/components/StatusTimeline';
import { LocalContentClient, setContentClient } from '../src/content/contentClient';
import type { ContentClient, ContentVariant, StatusChangeEntry } from '../src/content/contentTypes';

beforeEach(() => vi.useRealTimers());

const variant: ContentVariant = {
  id: 'cv_1',
  contentItemId: 'ci_1',
  channel: 'linkedin',
  format: 'post',
  body: 'x',
  hashtags: [],
  status: 'scheduled',
};

describe('LocalContentClient status history', () => {
  it('records created → scheduled → exported transitions', async () => {
    const client = new LocalContentClient();
    const item = (await client.listItems())[0];
    const v = await client.addVariant(item.id, { channel: 'linkedin', format: 'post', body: 'x' });
    await client.updateVariant(v.id, {}); // no status change
    await client.schedule(v.id, '2030-01-01T09:00:00.000Z');

    const history = await client.listStatusHistory(v.id);
    expect(history.map((c) => c.to)).toEqual(['draft', 'scheduled']);
    expect(history[0].from).toBeUndefined();
  });
});

describe('StatusTimeline', () => {
  function stub(history: StatusChangeEntry[]): ContentClient {
    return { name: 'stub', listStatusHistory: () => Promise.resolve(history) } as unknown as ContentClient;
  }

  it('renders the transitions', async () => {
    setContentClient(
      stub([
        { id: 'sc_1', variantId: 'cv_1', to: 'draft', at: '2026-06-10T00:00:00.000Z' },
        { id: 'sc_2', variantId: 'cv_1', from: 'draft', to: 'scheduled', actor: 'alice', at: '2026-06-11T00:00:00.000Z' },
      ]),
    );
    render(<StatusTimeline variant={variant} />);
    expect(await screen.findByText('History')).toBeInTheDocument();
    expect(screen.getByText('draft → scheduled')).toBeInTheDocument();
    expect(screen.getByText('by alice')).toBeInTheDocument();
  });

  it('renders nothing when there is no history', async () => {
    setContentClient(stub([]));
    const { container } = render(<StatusTimeline variant={variant} />);
    await Promise.resolve();
    expect(container.querySelector('[data-testid="status-timeline"]')).toBeNull();
  });
});
