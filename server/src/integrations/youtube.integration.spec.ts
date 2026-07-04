import { YouTubeIntegration, buildVideoMeta, videoUrlOf } from './youtube.integration';
import type { Post } from '../domain/types';

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    platform: 'youtube',
    body: 'Why sleep matters for recovery.\n\nFull explainer in the video.',
    scheduledAt: '',
    status: 'scheduled',
    media: [{ id: 'm1', type: 'video', label: 'short.mp4', url: 'http://localhost/uploads/short.mp4' }],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildVideoMeta', () => {
  it('prefers the hook as the title, capped at 100 chars', () => {
    const meta = buildVideoMeta(post({ hook: 'x'.repeat(150) }));
    expect(meta.title).toHaveLength(100);
  });

  it('falls back to the first non-empty body line', () => {
    const meta = buildVideoMeta(post());
    expect(meta.title).toBe('Why sleep matters for recovery.');
    expect(meta.description).toContain('Full explainer');
  });
});

describe('videoUrlOf', () => {
  it('returns the attached video url', () => {
    expect(videoUrlOf(post())).toBe('http://localhost/uploads/short.mp4');
  });

  it('tells the user to attach a video when there is none', () => {
    expect(() => videoUrlOf(post({ media: [] }))).toThrow(/attach one to the post/);
  });
});

describe('YouTubeIntegration.publish', () => {
  const integ = new YouTubeIntegration('cid', 'csecret');
  const token = {
    platform: 'youtube' as const,
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 1e6,
    scopes: [],
    accountId: 'UC123',
  };
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  const videoBytes = () => new Response(new ArrayBuffer(8), { status: 200 });
  const initSession = () =>
    new Response('', { status: 200, headers: { location: 'https://upload.session/1' } });
  const uploaded = () => new Response(JSON.stringify({ id: 'vid123' }), { status: 200 });

  it('uploads the attached video and returns the watch permalink', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(videoBytes()) // read attachment
      .mockResolvedValueOnce(initSession()) // resumable session
      .mockResolvedValueOnce(uploaded()); // PUT bytes

    const result = await integ.publish(post(), token);
    expect(result.remoteId).toBe('vid123');
    expect(result.permalink).toBe('https://www.youtube.com/watch?v=vid123');
    expect(result.refreshedToken).toBeUndefined();
  });

  it('refreshes an expired access token once and hands back the new pair', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(videoBytes())
      // first init → 401 (expired access token)
      .mockResolvedValueOnce(new Response('{"error":"unauthorized"}', { status: 401 }))
      // refresh grant
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'new-access', expires_in: 3600 }), { status: 200 }),
      )
      // retry: read attachment again, init, PUT
      .mockResolvedValueOnce(videoBytes())
      .mockResolvedValueOnce(initSession())
      .mockResolvedValueOnce(uploaded());

    const result = await integ.publish(post(), token);
    expect(result.remoteId).toBe('vid123');
    expect(result.refreshedToken?.accessToken).toBe('new-access');
    // Google does not rotate refresh tokens — the original one is kept.
    expect(result.refreshedToken?.refreshToken).toBe('refresh');
  });
});
