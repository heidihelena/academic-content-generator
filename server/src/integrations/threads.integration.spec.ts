import { ThreadsIntegration } from './threads.integration';
import type { AccessToken, MediaAttachment, Post } from '../domain/types';

const image: MediaAttachment = { id: 'm1', type: 'image', label: 'pic', url: 'https://cdn/x.png' };

const post = (over: Partial<Post> = {}): Post => ({
  id: 'p1',
  platform: 'threads',
  body: 'A finding worth sharing.',
  scheduledAt: '',
  status: 'scheduled',
  media: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

const token = (over: Partial<AccessToken> = {}): AccessToken => ({
  platform: 'threads',
  accessToken: 'tok',
  expiresAt: 0,
  scopes: [],
  accountId: '9001',
  ...over,
});

const jsonRes = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });

describe('ThreadsIntegration', () => {
  const th = new ThreadsIntegration('cid', 'secret');
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('builds the authorize URL with comma-joined threads scopes', () => {
    const url = new URL(th.authorizeUrl('https://app/cb', 's'));
    expect(url.origin + url.pathname).toBe('https://threads.net/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('threads_basic,threads_content_publish');
  });

  it('requires a user id on the token', async () => {
    await expect(th.publish(post(), token({ accountId: undefined }))).rejects.toThrow(/user id/);
  });

  it('publishes a TEXT container when there is no image, then maps the permalink', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonRes({ id: 'container-1' }))
      .mockResolvedValueOnce(jsonRes({ id: 'th-9' }))
      .mockResolvedValueOnce(jsonRes({ permalink: 'https://threads.net/t/abc' }));
    global.fetch = fetchMock as never;

    const res = await th.publish(post({ body: 'hello' }), token());
    expect(res).toEqual({ remoteId: 'th-9', permalink: 'https://threads.net/t/abc' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/9001/threads?');
    expect(fetchMock.mock.calls[0][0]).toContain('media_type=TEXT');
    expect(fetchMock.mock.calls[1][0]).toContain('/9001/threads_publish?');
  });

  it('uses an IMAGE container when the post carries an image', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonRes({ id: 'container-2' }))
      .mockResolvedValueOnce(jsonRes({ id: 'th-10' }))
      .mockResolvedValueOnce(jsonRes({ permalink: 'https://threads.net/t/xyz' }));
    global.fetch = fetchMock as never;

    await th.publish(post({ body: 'pic post', media: [image] }), token());
    expect(fetchMock.mock.calls[0][0]).toContain('media_type=IMAGE');
    expect(fetchMock.mock.calls[0][0]).toContain('image_url=https');
  });
});
