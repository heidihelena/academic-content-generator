import { LinkedInIntegration } from './linkedin.integration';
import type { AccessToken, Post } from '../domain/types';

const post = (over: Partial<Post> = {}): Post => ({
  id: 'p1',
  platform: 'linkedin',
  body: 'A finding worth sharing.',
  scheduledAt: '',
  status: 'scheduled',
  media: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

const token = (over: Partial<AccessToken> = {}): AccessToken => ({
  platform: 'linkedin',
  accessToken: 'tok',
  expiresAt: 0,
  scopes: [],
  accountId: 'urn:li:person:abc',
  ...over,
});

describe('LinkedInIntegration', () => {
  const li = new LinkedInIntegration('client-id', 'secret', '202401');
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('builds the OpenID authorize URL with the member-post scopes', () => {
    const url = new URL(li.authorizeUrl('https://app/cb', 'st8'));
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/oauth/v2/authorization');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app/cb');
    expect(url.searchParams.get('state')).toBe('st8');
    // LinkedIn joins scopes with spaces.
    expect(url.searchParams.get('scope')).toBe('openid profile w_member_social');
  });

  it('rejects publishing without a member URN on the token', async () => {
    await expect(li.publish(post(), token({ accountId: undefined }))).rejects.toThrow(/member URN/);
  });

  it('posts to the Posts API with the versioned headers and maps x-restli-id → permalink', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: (k: string) => (k === 'x-restli-id' ? 'urn:li:share:99' : null) },
      text: async () => '',
    });
    global.fetch = fetchMock as never;

    const res = await li.publish(post({ body: 'Hello LinkedIn' }), token());
    expect(res.remoteId).toBe('urn:li:share:99');
    expect(res.permalink).toBe('https://www.linkedin.com/feed/update/urn:li:share:99');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.linkedin.com/rest/posts');
    expect(init.method).toBe('POST');
    expect(init.headers['LinkedIn-Version']).toBe('202401');
    expect(init.headers['X-Restli-Protocol-Version']).toBe('2.0.0');
    expect(init.headers.authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toMatchObject({
      author: 'urn:li:person:abc',
      commentary: 'Hello LinkedIn',
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
    });
  });

  it('throws with the platform + status when the API rejects the post', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: { get: () => null },
      text: async () => 'bad',
    }) as never;
    await expect(li.publish(post(), token())).rejects.toThrow(/linkedin API 422/);
  });
});
