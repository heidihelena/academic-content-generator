import type { Post } from '../types';
import { isSameDay, startOfDay } from './dateUtils';

/**
 * Pure rescheduling logic used by the calendar's drag-and-drop.
 *
 * Keeping this independent of the DOM/React means drag-and-drop behavior can be
 * unit-tested without simulating real pointer events: components only translate
 * a drop into a (postId, targetDay) pair and call `reschedulePost`.
 */

/**
 * Returns a new `scheduledAt` ISO string that moves `post` to `targetDay`
 * while preserving its original time-of-day.
 */
export function reschedulePost(post: Post, targetDay: Date): string {
  const original = new Date(post.scheduledAt);
  const next = startOfDay(targetDay);
  next.setHours(original.getHours(), original.getMinutes(), 0, 0);
  return next.toISOString();
}

/**
 * Applies a reschedule to a list of posts immutably. Returns a new array with
 * the matching post updated, or the same array reference if nothing changed
 * (e.g. dropped onto its current day).
 */
export function applyReschedule(posts: Post[], postId: string, targetDay: Date): Post[] {
  const target = posts.find((p) => p.id === postId);
  if (!target) return posts;
  if (isSameDay(new Date(target.scheduledAt), targetDay)) return posts;

  const scheduledAt = reschedulePost(target, targetDay);
  return posts.map((p) =>
    p.id === postId ? { ...p, scheduledAt, updatedAt: new Date().toISOString() } : p,
  );
}

/** Returns posts that fall on a specific day, sorted by time ascending. */
export function postsForDay(posts: Post[], day: Date): Post[] {
  return posts
    .filter((p) => isSameDay(new Date(p.scheduledAt), day))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}
