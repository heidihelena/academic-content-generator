import { buildStatusBody } from './mastodon.integration';
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
