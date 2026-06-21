import { describe, expect, it } from 'vitest';
import type { Post } from '../src/types';
import { conflictingIds, detectConflicts } from '../src/lib/conflicts';

function post(p: Partial<Post>): Post {
  return {
    id: Math.random().toString(36).slice(2),
    platform: 'instagram',
    body: '',
    scheduledAt: '2026-06-17T09:00:00.000Z',
    status: 'scheduled',
    media: [],
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}

describe('detectConflicts', () => {
  it('flags same-platform posts scheduled within the window', () => {
    const a = post({ id: 'a', scheduledAt: new Date('2026-06-17T09:00').toISOString() });
    const b = post({ id: 'b', scheduledAt: new Date('2026-06-17T09:20').toISOString() });
    const pairs = detectConflicts([a, b], 30);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].gapMinutes).toBe(20);
  });

  it('ignores posts on different platforms', () => {
    const a = post({ id: 'a', platform: 'instagram', scheduledAt: new Date('2026-06-17T09:00').toISOString() });
    const b = post({ id: 'b', platform: 'linkedin', scheduledAt: new Date('2026-06-17T09:10').toISOString() });
    expect(detectConflicts([a, b], 30)).toHaveLength(0);
  });

  it('ignores posts spaced beyond the window', () => {
    const a = post({ id: 'a', scheduledAt: new Date('2026-06-17T09:00').toISOString() });
    const b = post({ id: 'b', scheduledAt: new Date('2026-06-17T11:00').toISOString() });
    expect(detectConflicts([a, b], 30)).toHaveLength(0);
  });

  it('ignores drafts (not competing for a publish slot)', () => {
    const a = post({ id: 'a', status: 'draft', scheduledAt: new Date('2026-06-17T09:00').toISOString() });
    const b = post({ id: 'b', status: 'draft', scheduledAt: new Date('2026-06-17T09:05').toISOString() });
    expect(detectConflicts([a, b], 30)).toHaveLength(0);
  });

  it('conflictingIds returns every involved id', () => {
    const a = post({ id: 'a', scheduledAt: new Date('2026-06-17T09:00').toISOString() });
    const b = post({ id: 'b', scheduledAt: new Date('2026-06-17T09:10').toISOString() });
    const ids = conflictingIds([a, b], 30);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });
});
