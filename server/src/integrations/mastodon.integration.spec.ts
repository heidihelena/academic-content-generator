import { buildStatusBody, MastodonIntegration } from './mastodon.integration';
import type { Post } from '../domain/types';

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    platform: 'mastodon',
    body: 'A finding worth sharing.',
    scheduledAt: '',
    status: 'scheduled',
    media: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildStatusBody', () => {
  it('posts a public status with no reply by default', () => {
    const body = buildStatusBody(post());
    expect(body.status).toBe('A finding worth sharing.');
    expect(body.visibility).toBe('public');
    expect('in_reply_to_id' in body).toBe(false);
  });

  it('chains a reply using the parent status id', () => {
    const body = buildStatusBody(post({ body: 'part 2' }), {
      root: { uri: '111' },
      parent: { uri: '222' },
    });
    // Mastodon only needs the immediate parent id to thread.
    expect((body as { in_reply_to_id?: string }).in_reply_to_id).toBe('222');
  });
});

describe('MastodonIntegration.connect error guidance', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("explains the instance field when the URL isn't a Mastodon server", async () => {
    // A website answers the API path with its HTML 404 page.
    global.fetch = jest.fn().mockResolvedValue(
      new Response('<!DOCTYPE html><html><body>404</body></html>', { status: 404 }),
    );
    const client = new MastodonIntegration('https://www.example.com', 'token');
    await expect(client.connect()).rejects.toThrow(
      /doesn't look like a Mastodon server.*part after the second @/,
    );
  });

  it('passes real API errors through untouched (bad token)', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'The access token is invalid' }), { status: 401 }),
    );
    const client = new MastodonIntegration('https://mastodon.social', 'bad');
    await expect(client.connect()).rejects.toThrow(/mastodon API 401/);
  });

  it('connects and derives the full handle from the instance host', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ username: 'vahtian', acct: 'vahtian', followers_count: 12 }),
        { status: 200 },
      ),
    );
    const client = new MastodonIntegration('https://mastodon.social', 'token');
    const { account } = await client.connect();
    expect(account.handle).toBe('@vahtian@mastodon.social');
    expect(account.status).toBe('connected');
  });
});
