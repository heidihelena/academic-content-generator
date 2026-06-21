import { InstagramIntegration } from './instagram.integration';
import { ThreadsIntegration } from './threads.integration';
import { LinkedInIntegration } from './linkedin.integration';
import { MockIntegration } from './mock.integration';

const REDIRECT = 'https://app.example/api/accounts/oauth/callback';
const STATE = 'state-123';

describe('real integration authorize URLs', () => {
  it('Instagram targets the IG authorize endpoint with publish scope', () => {
    const url = new URL(new InstagramIntegration('cid', 'secret').authorizeUrl(REDIRECT, STATE));
    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('state')).toBe(STATE);
    expect(url.searchParams.get('scope')).toContain('instagram_business_content_publish');
  });

  it('Threads targets the Threads authorize endpoint', () => {
    const url = new URL(new ThreadsIntegration('cid', 'secret').authorizeUrl(REDIRECT, STATE));
    expect(url.origin + url.pathname).toBe('https://threads.net/oauth/authorize');
    expect(url.searchParams.get('scope')).toContain('threads_content_publish');
  });

  it('LinkedIn targets the OAuth authorize endpoint with member scope', () => {
    const url = new URL(new LinkedInIntegration('cid', 'secret', '202401').authorizeUrl(REDIRECT, STATE));
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/oauth/v2/authorization');
    // LinkedIn uses space-delimited scopes.
    expect(url.searchParams.get('scope')).toContain('w_member_social');
  });
});

describe('real integration guard rails', () => {
  it('connect requires code + redirectUri', async () => {
    await expect(new InstagramIntegration('c', 's').connect({})).rejects.toThrow(/code\/redirectUri/);
    await expect(new ThreadsIntegration('c', 's').connect({ code: 'x' })).rejects.toThrow(/code\/redirectUri/);
    await expect(new LinkedInIntegration('c', 's', '202401').connect()).rejects.toThrow(/code\/redirectUri/);
  });

  it('Instagram publish requires an image URL', async () => {
    const post: any = { body: 'hi', media: [] };
    const token: any = { accountId: '123', accessToken: 't' };
    await expect(new InstagramIntegration('c', 's').publish(post, token)).rejects.toThrow(/image/i);
  });

  it('mock still satisfies the interface', async () => {
    const mock = new MockIntegration('instagram', { handle: '@x', displayName: 'x', followers: 1 });
    const { account, token } = await mock.connect();
    expect(account.status).toBe('connected');
    expect(token.platform).toBe('instagram');
  });
});
