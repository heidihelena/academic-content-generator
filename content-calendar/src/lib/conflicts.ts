import type { Post } from '../types';

/**
 * Scheduling-conflict detection: two posts on the SAME platform scheduled within
 * `withinMinutes` of each other are flagged (publishing them back-to-back tends
 * to cannibalize reach and can trip platform rate limits).
 *
 * Pure and tested; powers the conflict badge, card warning dots, and the
 * ConflictWarningModal.
 */

export interface ConflictPair {
  a: Post;
  b: Post;
  /** Minutes between the two posts. */
  gapMinutes: number;
}

export function detectConflicts(posts: Post[], withinMinutes = 30): ConflictPair[] {
  const pairs: ConflictPair[] = [];
  // Only published/scheduled posts compete for a real publish slot.
  const live = posts.filter((p) => p.status === 'scheduled' || p.status === 'published');
  const byPlatform = new Map<string, Post[]>();
  for (const p of live) {
    const list = byPlatform.get(p.platform) ?? [];
    list.push(p);
    byPlatform.set(p.platform, list);
  }
  for (const list of byPlatform.values()) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      const gap =
        (new Date(sorted[i].scheduledAt).getTime() -
          new Date(sorted[i - 1].scheduledAt).getTime()) /
        60000;
      if (gap <= withinMinutes) {
        pairs.push({ a: sorted[i - 1], b: sorted[i], gapMinutes: Math.round(gap) });
      }
    }
  }
  return pairs;
}

/** The set of post ids involved in any conflict — handy for per-card flags. */
export function conflictingIds(posts: Post[], withinMinutes = 30): Set<string> {
  const ids = new Set<string>();
  for (const { a, b } of detectConflicts(posts, withinMinutes)) {
    ids.add(a.id);
    ids.add(b.id);
  }
  return ids;
}
