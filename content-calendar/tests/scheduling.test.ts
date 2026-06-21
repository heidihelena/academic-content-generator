import { describe, expect, it } from 'vitest';
import type { Post } from '../src/types';
import { applyReschedule, postsForDay, reschedulePost } from '../src/lib/scheduling';

function makePost(overrides: Partial<Post> = {}): Post {
  const now = '2026-06-15T00:00:00.000Z';
  return {
    id: 'p1',
    platform: 'instagram',
    body: 'Hello',
    scheduledAt: '2026-06-17T09:30:00.000Z',
    status: 'scheduled',
    media: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('scheduling (drag-and-drop logic)', () => {
  it('reschedulePost preserves time-of-day when moving days', () => {
    const post = makePost({ scheduledAt: new Date('2026-06-17T09:30:00').toISOString() });
    const target = new Date('2026-06-19T00:00:00');
    const result = new Date(reschedulePost(post, target));
    expect(result.getDate()).toBe(19);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it('applyReschedule moves the matching post immutably', () => {
    const posts = [makePost({ id: 'a' }), makePost({ id: 'b' })];
    const target = new Date('2026-06-20T00:00:00');
    const next = applyReschedule(posts, 'b', target);
    expect(next).not.toBe(posts);
    expect(new Date(next[1].scheduledAt).getDate()).toBe(20);
    // The untouched post keeps its original reference value.
    expect(next[0].scheduledAt).toBe(posts[0].scheduledAt);
  });

  it('applyReschedule is a no-op when dropped on the same day', () => {
    const posts = [makePost({ id: 'a', scheduledAt: new Date('2026-06-17T09:30:00').toISOString() })];
    const sameDay = new Date('2026-06-17T00:00:00');
    expect(applyReschedule(posts, 'a', sameDay)).toBe(posts);
  });

  it('applyReschedule ignores unknown post ids', () => {
    const posts = [makePost({ id: 'a' })];
    expect(applyReschedule(posts, 'missing', new Date('2026-06-20'))).toBe(posts);
  });

  it('postsForDay filters and sorts by time', () => {
    const posts = [
      makePost({ id: 'late', scheduledAt: new Date('2026-06-17T18:00:00').toISOString() }),
      makePost({ id: 'early', scheduledAt: new Date('2026-06-17T08:00:00').toISOString() }),
      makePost({ id: 'other', scheduledAt: new Date('2026-06-18T08:00:00').toISOString() }),
    ];
    const result = postsForDay(posts, new Date('2026-06-17T00:00:00'));
    expect(result.map((p) => p.id)).toEqual(['early', 'late']);
  });
});
