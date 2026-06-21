import { describe, expect, it } from 'vitest';
import type { Post } from '../src/types';
import {
  bestPostingDays,
  platformBreakdown,
  postsPerWeek,
  postsThisWeek,
  scheduledVsPublished,
  statusBreakdown,
} from '../src/analytics/calculations';

function post(p: Partial<Post>): Post {
  return {
    id: Math.random().toString(36),
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

describe('analytics calculations', () => {
  const posts: Post[] = [
    post({ platform: 'instagram', status: 'published', scheduledAt: new Date('2026-06-15T09:00').toISOString(), engagement: { likes: 100, comments: 10, shares: 5, impressions: 1000 } }),
    post({ platform: 'instagram', status: 'scheduled', scheduledAt: new Date('2026-06-16T09:00').toISOString() }),
    post({ platform: 'linkedin', status: 'published', scheduledAt: new Date('2026-06-15T09:00').toISOString(), engagement: { likes: 50, comments: 20, shares: 10, impressions: 800 } }),
    post({ platform: 'linkedin', status: 'failed', scheduledAt: new Date('2026-06-17T09:00').toISOString() }),
    post({ platform: 'threads', status: 'draft', scheduledAt: new Date('2026-06-18T09:00').toISOString() }),
  ];

  it('platformBreakdown counts and computes percentages', () => {
    const result = platformBreakdown(posts);
    const ig = result.find((r) => r.platform === 'instagram')!;
    expect(ig.count).toBe(2);
    expect(ig.percentage).toBe(40);
    expect(result.find((r) => r.platform === 'threads')!.count).toBe(1);
  });

  it('statusBreakdown returns all four statuses', () => {
    const result = statusBreakdown(posts);
    expect(result).toHaveLength(4);
    expect(result.find((r) => r.status === 'published')!.count).toBe(2);
    expect(result.find((r) => r.status === 'draft')!.count).toBe(1);
  });

  it('scheduledVsPublished counts the two operational states', () => {
    expect(scheduledVsPublished(posts)).toEqual({ scheduled: 1, published: 2 });
  });

  it('postsPerWeek groups by ISO week', () => {
    const result = postsPerWeek(posts);
    // All sample posts fall in ISO week 25 of 2026.
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('W25');
    expect(result[0].count).toBe(5);
  });

  it('bestPostingDays averages engagement per weekday', () => {
    const result = bestPostingDays(posts);
    expect(result).toHaveLength(7);
    // Monday (index 0) has the two published posts: (115 + 80) / 2 = 97.5 -> 98.
    const monday = result[0];
    expect(monday.dayName).toBe('Monday');
    expect(monday.avgEngagement).toBe(98);
    // A day with no published posts has zero average engagement.
    expect(result[6].avgEngagement).toBe(0);
  });

  it('postsThisWeek counts posts in the anchored week', () => {
    expect(postsThisWeek(posts, new Date('2026-06-17T00:00:00'))).toBe(5);
    // The previous week contains none of the sample posts.
    expect(postsThisWeek(posts, new Date('2026-06-08T00:00:00'))).toBe(0);
  });
});
