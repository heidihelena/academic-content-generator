import { InstagramIntegration } from './instagram.integration';
import type { AccessToken, MediaAttachment, Post } from '../domain/types';

const image: MediaAttachment = { id: 'm1', type: 'image', label: 'pic', url: 'https://cdn/x.png' };

const post = (over: Partial<Post> = {}): Post => ({
  id: 'p1',
  platform: 'instagram',
  body: 'A finding worth sharing.',
  scheduledAt: '',
  status: 'scheduled',
  media: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

const token = (over: Partial<AccessToken> = {}): AccessToken => ({
  platform: 'instagram',
  accessToken: 'tok',
  expiresAt: 0,
  scopes: [],
  accountId: '178414',
  ...over,
});

const jsonRes = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });

describe('InstagramIntegration', () => {
  const ig = new InstagramIntegration('cid', 'secret');
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('builds the authorize URL with comma-joined business scopes', () => {
    const url = new URL(ig.authorizeUrl('https://app/cb', 's'));
    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    // Instagram joins scopes with commas (not spaces).
    expect(url.searchParams.get('scope')).toBe(
      'instagram_business_basic,instagram_business_content_publish',
    );
  });

  it('requires an image with a public URL to publish (text-only is rejected)', async () => {
    await expect(ig.publish(post({ media: [] }), token())).rejects.toThrow(/image/);
  });

  it('requires a user id on the token', async () => {
    await expect(ig.publish(post({ media: [image] }), token({ accountId: undefined }))).rejects.toThrow(
      /user id/,
    );
  });

  it('creates a media container, publishes it, then resolves the permalink', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonRes({ id: 'container-1' }))
      .mockResolvedValueOnce(jsonRes({ id: 'media-9' }))
      .mockResolvedValueOnce(jsonRes({ permalink: 'https://instagram.com/p/abc' }));
    global.fetch = fetchMock as never;

    const res = await ig.publish(post({ body: 'cap', media: [image] }), token());
    expect(res).toEqual({ remoteId: 'media-9', permalink: 'https://instagram.com/p/abc' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/178414/media?');
    expect(fetchMock.mock.calls[0][0]).toContain('image_url=https');
    expect(fetchMock.mock.calls[1][0]).toContain('/178414/media_publish?');
    expect(fetchMock.mock.calls[1][0]).toContain('creation_id=container-1');
  });
});
