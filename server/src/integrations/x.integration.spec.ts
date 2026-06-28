import { XIntegration } from './x.integration';
import type { AccessToken, Post } from '../domain/types';

const post = (over: Partial<Post> = {}): Post => ({
  id: 'p1',
  platform: 'x',
  body: 'A finding worth sharing.',
  scheduledAt: '',
  status: 'scheduled',
  media: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

const token = (over: Partial<AccessToken> = {}): AccessToken => ({
  platform: 'x',
  accessToken: 'user-jwt',
  expiresAt: 0,
  scopes: [],
  accountId: '42',
  ...over,
});

const jsonRes = (data: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });

describe('XIntegration', () => {
  const x = new XIntegration('cid', 'secret');
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('builds an OAuth2 authorize URL with PKCE and tweet.write scope', () => {
    const url = new URL(x.authorizeUrl('https://app/cb', 'state123', 'CHALLENGE'));
    expect(url.origin + url.pathname).toBe('https://twitter.com/i/oauth2/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toContain('tweet.write');
    expect(url.searchParams.get('state')).toBe('state123');
    expect(url.searchParams.get('code_challenge')).toBe('CHALLENGE');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('exchanges the code (with PKCE verifier) and reads the profile on connect', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonRes({ access_token: 'at', refresh_token: 'rt', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonRes({ data: { id: '42', name: 'vahtian', username: 'vahtian' } }));
    global.fetch = fetchMock as never;

    const { account, token: tok } = await x.connect({
      code: 'c',
      redirectUri: 'https://app/cb',
      codeVerifier: 'verifier',
    });

    expect(tok.accessToken).toBe('at');
    expect(tok.refreshToken).toBe('rt');
    expect(tok.accountId).toBe('42');
    expect(account).toMatchObject({ platform: 'x', status: 'connected', handle: '@vahtian' });

    // Token exchange posts the verifier and a Basic auth header.
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toContain('code_verifier=verifier');
    expect(init.headers.authorization).toMatch(/^Basic /);
  });

  it('rejects connect without a PKCE verifier', async () => {
    await expect(x.connect({ code: 'c', redirectUri: 'https://app/cb' })).rejects.toThrow(/code_verifier/);
  });

  it('publishes via POST /2/tweets and maps a permalink', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonRes({ data: { id: '1799', text: 'hi' } }));
    global.fetch = fetchMock as never;

    const res = await x.publish(post({ body: 'hi' }), token());
    expect(res).toEqual({ remoteId: '1799', permalink: 'https://x.com/i/web/status/1799' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twitter.com/2/tweets');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ text: 'hi' });
    expect(init.headers.authorization).toBe('Bearer user-jwt');
  });
});
