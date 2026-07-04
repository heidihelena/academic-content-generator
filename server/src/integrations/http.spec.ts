import { apiFetch, summarizeErrorBody } from './http';

describe('summarizeErrorBody', () => {
  it('replaces an HTML page with a one-line hint', () => {
    const html = '<!DOCTYPE html><html><head><title>404</title></head><body>…</body></html>';
    expect(summarizeErrorBody('mastodon', html)).toBe(
      'got an HTML page instead of an API response — is that URL really a mastodon server?',
    );
  });

  it('truncates long plain-text bodies', () => {
    const long = 'x'.repeat(1000);
    const detail = summarizeErrorBody('bluesky', long);
    expect(detail.length).toBeLessThan(320);
    expect(detail.endsWith('…')).toBe(true);
  });

  it('passes short plain-text bodies through unchanged', () => {
    expect(summarizeErrorBody('x', 'rate limited')).toBe('rate limited');
  });
});

describe('apiFetch error surfacing', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('never dumps an HTML error page into the thrown message', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('<!DOCTYPE html><html><body>a whole marketing site</body></html>', {
        status: 404,
      }),
    );
    await expect(apiFetch('mastodon', 'https://example.com/api/v1/x')).rejects.toThrow(
      /mastodon API 404: got an HTML page instead of an API response/,
    );
  });

  it('keeps JSON error bodies intact', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'The access token is invalid' }), { status: 401 }),
    );
    await expect(apiFetch('mastodon', 'https://example.com/api/v1/x')).rejects.toThrow(
      /mastodon API 401: .*access token is invalid/,
    );
  });
});
