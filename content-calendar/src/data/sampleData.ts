import type { ConnectedAccount, Post, Platform, PostStatus } from '../types';
import { startOfWeek, DAY_MS } from '../lib/dateUtils';
import { createId } from '../lib/id';

/**
 * Realistic sample data for vahtian.com.
 *
 * Posts are generated relative to the current week so the calendar always looks
 * populated regardless of when the app is opened. Pass a fixed `now` (tests do)
 * for deterministic output.
 */

interface Seed {
  platform: Platform;
  dayOffset: number; // 0 = Monday … 6 = Sunday of the current week
  hour: number;
  minute: number;
  status: PostStatus;
  body: string;
  owner?: string;
  campaign?: string;
  media?: { type: 'image' | 'video'; label: string };
  engagement?: { likes: number; comments: number; shares: number; impressions: number };
}

const SEEDS: Seed[] = [
  {
    platform: 'instagram',
    dayOffset: 0,
    hour: 9,
    minute: 0,
    status: 'published',
    body: 'Monday motivation ☕️ Behind every effortless brand is a relentless content engine. Here are 3 systems we use at vahtian to never miss a post. #contentstrategy #socialmedia',
    owner: 'Heidi',
    campaign: 'Q2 Brand',
    media: { type: 'image', label: 'Studio flat-lay' },
    engagement: { likes: 842, comments: 37, shares: 64, impressions: 12400 },
  },
  {
    platform: 'linkedin',
    dayOffset: 0,
    hour: 13,
    minute: 30,
    status: 'published',
    body: 'We analyzed 10,000 B2B posts. The ones that performed best had one thing in common: they started with a specific number, not a hook cliché. Full breakdown below 👇',
    owner: 'Heidi',
    campaign: 'Data Series',
    engagement: { likes: 311, comments: 58, shares: 41, impressions: 9800 },
  },
  {
    platform: 'threads',
    dayOffset: 1,
    hour: 8,
    minute: 15,
    status: 'scheduled',
    body: 'Hot take: your engagement rate matters more than your follower count. Reply with your niche and I\'ll tell you a realistic benchmark.',
  },
  {
    platform: 'instagram',
    dayOffset: 1,
    hour: 18,
    minute: 0,
    status: 'scheduled',
    body: 'New Reel dropping tonight 🎬 A 30-second teardown of a viral campaign and why it actually worked. Save this for later!',
    media: { type: 'video', label: 'Reel: campaign teardown' },
  },
  {
    platform: 'linkedin',
    dayOffset: 2,
    hour: 10,
    minute: 0,
    status: 'scheduled',
    body: 'Carousel: 7 content formats that consistently outperform on LinkedIn in 2026. Swipe through — slide 5 surprised even us.',
    owner: 'Alex',
    campaign: 'Data Series',
    media: { type: 'image', label: 'Carousel · 7 slides' },
  },
  {
    platform: 'threads',
    dayOffset: 2,
    hour: 15,
    minute: 45,
    status: 'draft',
    body: 'Drafting a thread on building in public. What\'s the one metric you wish more founders shared openly?',
  },
  {
    platform: 'instagram',
    dayOffset: 3,
    hour: 12,
    minute: 0,
    status: 'scheduled',
    body: 'Throwback to our favorite client launch 🚀 From 0 to 50k followers in 90 days. The strategy thread is in our bio.',
    media: { type: 'image', label: 'Case study graphic' },
  },
  {
    platform: 'linkedin',
    dayOffset: 3,
    hour: 16,
    minute: 30,
    status: 'failed',
    body: 'Scheduling experiment: does posting at 4:30pm beat the 9am slot for B2B? We ran the test for 30 days. Results inside.',
  },
  {
    platform: 'threads',
    dayOffset: 4,
    hour: 9,
    minute: 30,
    status: 'scheduled',
    body: 'Friday question: what\'s a social media "best practice" you\'ve stopped following — and your results got better?',
  },
  {
    platform: 'instagram',
    dayOffset: 4,
    hour: 19,
    minute: 0,
    status: 'draft',
    body: 'Weekend inspo 🌿 Slow content > fast content. A reminder that consistency beats virality every single time.',
    media: { type: 'image', label: 'Quote card' },
  },
  {
    platform: 'linkedin',
    dayOffset: 5,
    hour: 11,
    minute: 0,
    status: 'scheduled',
    body: 'Weekend read: our 2026 social media trend report is live. 22 pages, zero fluff. Link in comments.',
    media: { type: 'image', label: 'Report cover' },
  },
  {
    platform: 'threads',
    dayOffset: 6,
    hour: 17,
    minute: 0,
    status: 'draft',
    body: 'Planning next week\'s content. Drop a topic you want us to cover and we might build a whole post around it.',
  },
];

/** Builds the sample posts relative to the week containing `now`. */
export function createSamplePosts(now: Date = new Date()): Post[] {
  const monday = startOfWeek(now);
  const nowIso = now.toISOString();
  return SEEDS.map((seed) => {
    const date = new Date(monday.getTime() + seed.dayOffset * DAY_MS);
    date.setHours(seed.hour, seed.minute, 0, 0);
    return {
      id: createId('post'),
      platform: seed.platform,
      body: seed.body,
      scheduledAt: date.toISOString(),
      status: seed.status,
      owner: seed.owner,
      campaign: seed.campaign,
      media: seed.media
        ? [{ id: createId('media'), type: seed.media.type, label: seed.media.label }]
        : [],
      engagement: seed.engagement,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}

/** Default connected-accounts state for the demo. */
export function createSampleAccounts(): ConnectedAccount[] {
  return [
    {
      platform: 'instagram',
      status: 'connected',
      handle: '@vahtian',
      displayName: 'vahtian',
      followers: 18420,
      lastSyncedAt: new Date().toISOString(),
    },
    {
      platform: 'linkedin',
      status: 'connected',
      handle: 'vahtian',
      displayName: 'vahtian Inc.',
      followers: 7650,
      lastSyncedAt: new Date().toISOString(),
    },
    {
      platform: 'threads',
      status: 'disconnected',
    },
  ];
}
