import { Audience, ContentChannel } from '../domain/academic';

/**
 * Local-first, explainable baseline for "when to post". Per-channel best-practice
 * windows (weekday + hour) give a score in ~[0,1]; the learned EWMA bonus is
 * added on top by the service. No opaque model — every score is traceable to a
 * named window.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY = [1, 2, 3, 4, 5]; // Mon–Fri
const MIDWEEK = [2, 3, 4]; // Tue–Thu

/** Candidate hours to consider (UTC): morning, lunch, evening, night. */
export const CANDIDATE_HOURS = [8, 12, 17, 20];

interface Window {
  weekdays: number[];
  hours: number[];
}

/** Preferred windows per channel. */
const CHANNEL_WINDOWS: Record<ContentChannel, Window> = {
  linkedin: { weekdays: MIDWEEK, hours: [8, 12] },
  bluesky: { weekdays: WEEKDAY, hours: [12, 17] },
  threads: { weekdays: WEEKDAY, hours: [12, 20] },
  instagram: { weekdays: [...WEEKDAY, 6], hours: [12, 20] },
  newsletter: { weekdays: [2, 4], hours: [8] },
  teaching: { weekdays: WEEKDAY, hours: [8, 12] },
  talk: { weekdays: MIDWEEK, hours: [12, 17] },
  shorts: { weekdays: [...WEEKDAY, 6, 0], hours: [17, 20] },
};

export function label(weekday: number, hour: number): string {
  return `${WEEKDAYS[weekday]} ${String(hour).padStart(2, '0')}:00`;
}

/**
 * Baseline score for a slot: starts at 0.3, +0.4 if the weekday is preferred,
 * +0.3 if the hour is preferred. A small audience nudge favours evenings for
 * students/public and weekday mornings for peers.
 */
export function heuristicScore(
  channel: ContentChannel,
  audience: Audience,
  weekday: number,
  hour: number,
): number {
  const w = CHANNEL_WINDOWS[channel];
  let score = 0.3;
  if (w.weekdays.includes(weekday)) score += 0.4;
  if (w.hours.includes(hour)) score += 0.3;

  if ((audience === 'students' || audience === 'public') && hour >= 17) score += 0.1;
  if (audience === 'peers' && WEEKDAY.includes(weekday) && hour <= 12) score += 0.1;

  return Math.min(1, score);
}

/** All candidate (weekday, hour) slots. */
export function candidateSlots(): Array<{ weekday: number; hour: number }> {
  const slots: Array<{ weekday: number; hour: number }> = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (const hour of CANDIDATE_HOURS) slots.push({ weekday, hour });
  }
  return slots;
}
