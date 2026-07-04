import {
  blueskyPermalink,
  buildFeedPostRecord,
  detectFacets,
  toBskyReply,
  BlueskyIntegration,
} from './bluesky.integration';

describe('Bluesky facets', () => {
  it('returns no facets for plain text', () => {
    expect(detectFacets('Just some findings, no links here.')).toEqual([]);
  });

  it('marks a URL with correct UTF-8 byte offsets', () => {
    const text = 'Read it: https://doi.org/10.1/x now';
    const [facet] = detectFacets(text);
    expect(facet.features[0].uri).toBe('https://doi.org/10.1/x');
    // Byte offsets must point exactly at the URL substring.
    expect(text.slice(facet.index.byteStart, facet.index.byteEnd)).toBe('https://doi.org/10.1/x');
  });

  it('accounts for multibyte characters before the link', () => {
    const text = '🌳🌳 see https://example.com';
    const [facet] = detectFacets(text);
    const bytes = Buffer.from(text, 'utf8');
    expect(bytes.slice(facet.index.byteStart, facet.index.byteEnd).toString('utf8')).toBe(
      'https://example.com',
    );
  });

  it('trims trailing punctuation from the linked URL', () => {
    const [facet] = detectFacets('More at https://example.com/page.');
    expect(facet.features[0].uri).toBe('https://example.com/page');
  });
});

describe('buildFeedPostRecord', () => {
  it('builds an app.bsky.feed.post record without facets when there are no links', () => {
    const rec = buildFeedPostRecord('Hello world', '2026-06-22T09:00:00.000Z');
    expect(rec.$type).toBe('app.bsky.feed.post');
    expect(rec.text).toBe('Hello world');
    expect(rec.createdAt).toBe('2026-06-22T09:00:00.000Z');
    expect('facets' in rec).toBe(false);
  });

  it('includes facets when the text has a link', () => {
    const rec = buildFeedPostRecord('See https://doi.org/10.1/x');
    expect((rec as { facets?: unknown[] }).facets).toHaveLength(1);
  });
});

describe('thread reply chaining', () => {
  const ref = {
    root: { uri: 'at://did/app.bsky.feed.post/root', cid: 'cidroot' },
    parent: { uri: 'at://did/app.bsky.feed.post/parent', cid: 'cidparent' },
  };

  it('toBskyReply passes through strong refs when both CIDs are present', () => {
    expect(toBskyReply(ref)).toEqual(ref);
  });

  it('toBskyReply returns undefined when a CID is missing', () => {
    expect(toBskyReply({ root: { uri: 'a' }, parent: { uri: 'b' } })).toBeUndefined();
    expect(toBskyReply(undefined)).toBeUndefined();
  });

  it('buildFeedPostRecord includes the reply ref when chaining', () => {
    const rec = buildFeedPostRecord('part 2', '2026-06-22T09:00:00.000Z', ref);
    expect((rec as { reply?: unknown }).reply).toEqual(ref);
  });

  it('buildFeedPostRecord omits reply for the first post', () => {
    const rec = buildFeedPostRecord('part 1');
    expect('reply' in rec).toBe(false);
  });
});

describe('blueskyPermalink', () => {
  it('builds a bsky.app URL from a DID and at:// uri', () => {
    expect(blueskyPermalink('did:plc:abc', 'at://did:plc:abc/app.bsky.feed.post/3kxyz')).toBe(
      'https://bsky.app/profile/did:plc:abc/post/3kxyz',
    );
  });
});

describe('BlueskyIntegration.publish guards', () => {
  const integ = new BlueskyIntegration('https://bsky.social', 'me.bsky.social', 'app-pass');
  const base = {
    id: 'p1',
    platform: 'bluesky' as const,
    body: 'x',
    scheduledAt: '',
    status: 'scheduled' as const,
    media: [],
    createdAt: '',
    updatedAt: '',
  };

  it('rejects posts over the 300-character limit', async () => {
    await expect(
      integ.publish({ ...base, body: 'a'.repeat(301) }, {
        platform: 'bluesky',
        accessToken: 't',
        expiresAt: Date.now(),
        scopes: [],
        accountId: 'did:plc:abc',
      }),
    ).rejects.toThrow(/300 characters/);
  });

  it('requires a DID on the token', async () => {
    await expect(
      integ.publish(base, { platform: 'bluesky', accessToken: 't', expiresAt: Date.now(), scopes: [] }),
    ).rejects.toThrow(/DID/);
  });
});

describe('BlueskyIntegration.publish session refresh', () => {
  const integ = new BlueskyIntegration('https://bsky.social', 'me.bsky.social', 'app-pass');
  const post = {
    id: 'p1',
    platform: 'bluesky' as const,
    body: 'hello',
    scheduledAt: '',
    status: 'scheduled' as const,
    media: [],
    createdAt: '',
    updatedAt: '',
  };
  const token = {
    platform: 'bluesky' as const,
    accessToken: 'stale-access',
    refreshToken: 'old-refresh',
    expiresAt: Date.now() - 1000,
    scopes: [],
    accountId: 'did:plc:abc',
  };
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns the rotated pair so the caller can persist it', async () => {
    global.fetch = jest
      .fn()
      // 1) createRecord with the stale access JWT → 401
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'ExpiredToken' }), { status: 401 }))
      // 2) refreshSession → rotated pair
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessJwt: 'new-access', refreshJwt: 'new-refresh' }), { status: 200 }),
      )
      // 3) retried createRecord → success
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ uri: 'at://did:plc:abc/app.bsky.feed.post/3k', cid: 'cid1' }),
          { status: 200 },
        ),
      );

    const result = await integ.publish(post, token);
    expect(result.remoteId).toBe('at://did:plc:abc/app.bsky.feed.post/3k');
    expect(result.refreshedToken?.accessToken).toBe('new-access');
    expect(result.refreshedToken?.refreshToken).toBe('new-refresh');
    // Identity fields survive the rotation.
    expect(result.refreshedToken?.accountId).toBe('did:plc:abc');
  });

  it('explains reconnecting when the stored refresh token is dead', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'ExpiredToken' }), { status: 401 }))
      // refreshSession also rejects: the pair was rotated away by an earlier publish
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'ExpiredToken' }), { status: 401 }));

    await expect(integ.publish(post, token)).rejects.toThrow(
      /Bluesky session expired — reconnect the account/,
    );
  });

  it('does not attach refreshedToken when the first attempt succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ uri: 'at://x/app.bsky.feed.post/1', cid: 'c' }), { status: 200 }),
    );
    const result = await integ.publish(post, token);
    expect(result.refreshedToken).toBeUndefined();
  });
});
