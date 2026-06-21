import type { Platform, Post, PostStatus } from '../types';
import { PLATFORMS } from '../lib/platforms';
import { getISOWeek, getWeekDays, isSameDay, weekdayName } from '../lib/dateUtils';

/**
 * Pure analytics calculations.
 *
 * Owned by the Architecture & Data Agent and consumed by the UI's chart
 * components. Keeping these as pure functions makes the analytics fully unit
 * testable independent of rendering.
 */

export interface PlatformBreakdown {
  platform: Platform;
  count: number;
  percentage: number;
}

export interface StatusBreakdown {
  status: PostStatus;
  count: number;
}

export interface WeeklyCount {
  /** ISO week label, e.g. "W25". */
  label: string;
  weekNumber: number;
  count: number;
}

export interface DayPerformance {
  /** Mon..Sun index 0..6. */
  dayIndex: number;
  dayName: string;
  posts: number;
  /** Average engagement (likes+comments+shares) for published posts that day. */
  avgEngagement: number;
}

/** Counts posts grouped by platform, with share-of-total percentages. */
export function platformBreakdown(posts: Post[]): PlatformBreakdown[] {
  const total = posts.length || 1;
  return PLATFORMS.map((platform) => {
    const count = posts.filter((p) => p.platform === platform).length;
    return {
      platform,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });
}

/** Counts posts grouped by status (scheduled vs published vs draft vs failed). */
export function statusBreakdown(posts: Post[]): StatusBreakdown[] {
  const statuses: PostStatus[] = ['draft', 'scheduled', 'published', 'failed'];
  return statuses.map((status) => ({
    status,
    count: posts.filter((p) => p.status === status).length,
  }));
}

/** Number of scheduled vs published posts (the two operational states). */
export function scheduledVsPublished(posts: Post[]): { scheduled: number; published: number } {
  return {
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
  };
}

/**
 * Posts per ISO week across the dataset, sorted ascending by week number.
 * Returns one entry per week that contains at least one post.
 */
export function postsPerWeek(posts: Post[]): WeeklyCount[] {
  const byWeek = new Map<number, number>();
  for (const post of posts) {
    const week = getISOWeek(new Date(post.scheduledAt));
    byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekNumber, count]) => ({
      weekNumber,
      label: `W${weekNumber}`,
      count,
    }));
}

/**
 * Best posting days based on engagement.
 *
 * Uses real engagement on published posts where available; this is the same
 * shape a platform-analytics API would return, so swapping mock for real data
 * requires no change here.
 */
export function bestPostingDays(posts: Post[]): DayPerformance[] {
  const results: DayPerformance[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayPosts = posts.filter((p) => {
      const d = new Date(p.scheduledAt);
      // Convert JS Sunday-based day to Monday-based index.
      const mondayBased = (d.getDay() + 6) % 7;
      return mondayBased === dayIndex;
    });
    const engaged = dayPosts.filter((p) => p.engagement);
    const totalEngagement = engaged.reduce(
      (sum, p) =>
        sum + (p.engagement!.likes + p.engagement!.comments + p.engagement!.shares),
      0,
    );
    results.push({
      dayIndex,
      dayName: weekdayName(dayIndex),
      posts: dayPosts.length,
      avgEngagement: engaged.length ? Math.round(totalEngagement / engaged.length) : 0,
    });
  }
  return results;
}

/** Total posts scheduled within the week containing `weekAnchor`. */
export function postsThisWeek(posts: Post[], weekAnchor: Date): number {
  const days = getWeekDays(weekAnchor);
  return posts.filter((p) => {
    const d = new Date(p.scheduledAt);
    return days.some((day) => isSameDay(day, d));
  }).length;
}
