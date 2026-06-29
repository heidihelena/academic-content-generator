import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PublishAssistant } from '../src/components/PublishAssistant';
import { LocalContentClient, setContentClient } from '../src/content/contentClient';
import type { ContentClient, ContentVariant, PublishLogEntry } from '../src/content/contentTypes';

beforeEach(() => vi.useRealTimers());

const variant: ContentVariant = {
  id: 'cv_1',
  contentItemId: 'ci_1',
  channel: 'linkedin',
  format: 'post',
  body: 'The body',
  hook: 'The hook',
  hashtags: ['heat'],
  status: 'exported',
};

describe('LocalContentClient publish log', () => {
  it('records and lists a manual publish, stamping the variant channel', async () => {
    const client = new LocalContentClient();
    const v = (await client.listItems())[0].variants[0];
    await client.recordPublish(v.id, { publishedUrl: '  https://x/1  ', notes: '  first  ' });
    const logs = await client.listPublishLog(v.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].channel).toBe(v.channel);
    expect(logs[0].publishedUrl).toBe('https://x/1'); // trimmed
    expect(logs[0].notes).toBe('first');
  });

  it('returns [] for a variant with no logs', async () => {
    const client = new LocalContentClient();
    expect(await client.listPublishLog('cv_none')).toEqual([]);
  });
});

describe('PublishAssistant', () => {
  function stub(over: Partial<ContentClient> = {}): ContentClient {
    return {
      name: 'stub',
      listPublishLog: () => Promise.resolve([] as PublishLogEntry[]),
      recordPublish: (variantId: string) =>
        Promise.resolve({
          id: 'pl_1',
          variantId,
          channel: 'linkedin',
          publishedUrl: 'https://linkedin.com/p/1',
          publishedAt: '2026-06-20T00:00:00.000Z',
          createdAt: '2026-06-20T00:00:00.000Z',
        }),
      ...over,
    } as unknown as ContentClient;
  }

  it('records a manual publish and shows it in the log', async () => {
    setContentClient(stub());
    render(<PublishAssistant variant={variant} />);

    expect(await screen.findByText('Copy & record where you posted')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Published URL'), {
      target: { value: 'https://linkedin.com/p/1' },
    });
    fireEvent.click(screen.getByText('Mark published'));

    expect(await screen.findByTestId('publish-log')).toBeInTheDocument();
    expect(screen.getByText('https://linkedin.com/p/1')).toBeInTheDocument();
  });

  it('shows existing logs on open', async () => {
    setContentClient(
      stub({
        listPublishLog: () =>
          Promise.resolve([
            {
              id: 'pl_x',
              variantId: 'cv_1',
              channel: 'linkedin',
              publishedAt: '2026-06-19T00:00:00.000Z',
              notes: 'already live',
              createdAt: '2026-06-19T00:00:00.000Z',
            },
          ]),
      }),
    );
    render(<PublishAssistant variant={variant} />);
    expect(await screen.findByText('— already live')).toBeInTheDocument();
  });
});
