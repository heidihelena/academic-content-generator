import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssetsSection } from '../src/components/AssetsSection';
import { LocalContentClient, setContentClient } from '../src/content/contentClient';
import type { AssetEntry, ContentClient } from '../src/content/contentTypes';

beforeEach(() => vi.useRealTimers());

describe('LocalContentClient assets', () => {
  it('attaches, lists oldest first, and removes', async () => {
    const client = new LocalContentClient();
    const itemId = (await client.listItems())[0].id;
    const a = await client.attachAsset(itemId, { url: 'https://x/a.png', type: 'image', label: 'Cover' });
    await client.attachAsset(itemId, { url: 'https://x/b.mp4', type: 'video' });

    let list = await client.listAssets(itemId);
    expect(list.map((x) => x.type)).toEqual(['image', 'video']);
    expect(list[0].label).toBe('Cover');

    await client.removeAsset(itemId, a.id);
    list = await client.listAssets(itemId);
    expect(list).toHaveLength(1);
  });

  it('throws when attaching to a missing item', async () => {
    await expect(
      new LocalContentClient().attachAsset('ci_nope', { url: 'https://x/a.png', type: 'image' }),
    ).rejects.toThrow();
  });
});

describe('AssetsSection', () => {
  function stub(over: Partial<ContentClient> = {}): ContentClient {
    const store: AssetEntry[] = [];
    return {
      name: 'stub',
      listAssets: () => Promise.resolve([...store]),
      attachAsset: (itemId: string, input: { url: string; type: 'image' | 'video'; label?: string }) => {
        const e: AssetEntry = { id: `as_${store.length}`, itemId, ...input, createdAt: '2026-06-20' };
        store.push(e);
        return Promise.resolve(e);
      },
      removeAsset: () => Promise.resolve(),
      ...over,
    } as unknown as ContentClient;
  }

  it('attaches a media URL and previews an image', async () => {
    setContentClient(stub());
    render(<AssetsSection itemId="ci_1" />);

    fireEvent.change(screen.getByLabelText('Media URL'), { target: { value: 'https://cdn/x.png' } });
    fireEvent.click(screen.getByText('Attach'));

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn/x.png');
  });

  it('renders a video link for existing video assets', async () => {
    setContentClient(
      stub({
        listAssets: () =>
          Promise.resolve([
            { id: 'as_v', itemId: 'ci_1', url: 'https://cdn/clip.mp4', type: 'video', createdAt: '2026-06-19' },
          ]),
      }),
    );
    render(<AssetsSection itemId="ci_1" />);
    const link = await screen.findByText('▶ video');
    expect(link).toHaveAttribute('href', 'https://cdn/clip.mp4');
  });
});
