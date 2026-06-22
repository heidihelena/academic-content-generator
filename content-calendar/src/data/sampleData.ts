import type {
  ConnectedAccount,
  EvidenceLevel,
  Post,
  Platform,
  PostStatus,
  ReviewDecision,
  Source,
} from '../types';
import { startOfWeek, DAY_MS } from '../lib/dateUtils';
import { createId } from '../lib/id';

/**
 * Realistic sample data for an academic using the tool.
 *
 * The demo persona is Dr. Heidi Andersen, an environmental scientist sharing her
 * research with peers and the public. Posts span the editorial pipeline and the
 * scholarly networks (Bluesky, Mastodon) plus LinkedIn/Instagram, and carry the
 * academic layer: linked sources (DOIs/preprints) and an evidence level.
 *
 * Posts are generated relative to the current week so the calendar always looks
 * populated. Pass a fixed `now` (tests do) for deterministic output.
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
  brief?: string;
  audience?: string;
  theme?: string;
  hook?: string;
  source?: Source;
  evidenceLevel?: EvidenceLevel;
  reviewer?: string;
  reviews?: Array<{ decision: ReviewDecision; reviewer?: string; note?: string }>;
  media?: { type: 'image' | 'video'; label: string };
  engagement?: { likes: number; comments: number; shares: number; impressions: number };
}

/** The flagship paper most posts in the demo ladder up to. */
const HEAT_PAPER: Source = {
  title: 'Canopy cover and the urban heat-equity gap across 12 cities',
  authors: 'Andersen H, Okafor C, Lindqvist M',
  year: 2026,
  venue: 'Nature Climate Change',
  doi: '10.1038/s41558-026-01987-3',
};

const SEEDS: Seed[] = [
  {
    platform: 'bluesky',
    dayOffset: 0,
    hour: 9,
    minute: 0,
    status: 'learn',
    owner: 'Heidi',
    campaign: 'Heat-equity paper',
    theme: 'New paper',
    hook: 'A measurable climate-equity gap in who gets cooled.',
    evidenceLevel: 'peer_reviewed',
    source: HEAT_PAPER,
    body: '📄 New paper out today in Nature Climate Change. We show urban tree canopy cools low-income neighbourhoods ~2°C less than wealthy ones — a measurable climate-equity gap. A thread on what we found and why it matters 🧵👇',
    engagement: { likes: 612, comments: 48, shares: 173, impressions: 21400 },
  },
  {
    platform: 'linkedin',
    dayOffset: 0,
    hour: 13,
    minute: 30,
    status: 'published',
    owner: 'Heidi',
    campaign: 'Heat-equity paper',
    audience: 'General public & policymakers',
    theme: 'Plain-language summary',
    evidenceLevel: 'peer_reviewed',
    source: HEAT_PAPER,
    body: "What we found, in plain language:\n\nWealthier neighbourhoods have more street trees — and trees cool the air. So on a heatwave day, the coolest streets are often the richest ones. Across 12 cities, lower-income blocks ran up to 2°C hotter, even at the same density.\n\nWhy it matters: heat kills more people than any other extreme-weather event, and that burden isn't shared equally. Planting trees only where they already exist widens the gap; planting where they're missing can close it.\n\nOpen-access paper in the comments — happy to answer questions 👇",
    engagement: { likes: 287, comments: 64, shares: 39, impressions: 11200 },
  },
  {
    platform: 'mastodon',
    dayOffset: 1,
    hour: 8,
    minute: 15,
    status: 'review',
    owner: 'Heidi',
    reviewer: 'Priya Nair',
    theme: 'Key takeaway',
    evidenceLevel: 'peer_reviewed',
    source: HEAT_PAPER,
    body: "Heatwaves don't hit a city evenly. Our new work shows the cooling benefit of street trees is concentrated in wealthy neighbourhoods, leaving poorer blocks measurably hotter. Tree-planting policy needs an equity lens — not just a total-canopy target. #ClimateJustice",
  },
  {
    platform: 'bluesky',
    dayOffset: 1,
    hour: 18,
    minute: 0,
    status: 'approved',
    owner: 'Heidi',
    campaign: 'ESA 2026',
    theme: 'Conference',
    body: "Heading to #ESA2026 in August! I'll present our urban heat-equity findings Tuesday 11am, session B4. If you work on cities, climate adaptation, or environmental justice, let's find time for a coffee ☕️",
  },
  {
    platform: 'linkedin',
    dayOffset: 2,
    hour: 10,
    minute: 0,
    status: 'scheduled',
    owner: 'Heidi',
    audience: 'Fellow researchers',
    theme: 'Preprint',
    evidenceLevel: 'preliminary',
    source: {
      title: 'Cool-roof subsidies and indoor heat exposure in rental housing',
      authors: 'Andersen H, Ruiz D',
      year: 2026,
      venue: 'OSF Preprints',
      url: 'https://osf.io/preprints/example',
    },
    body: "New preprint 🔬 We tested whether cool-roof subsidies cut indoor heat in rental housing. Early result: yes — but only when paired with tenant protections, otherwise the savings get passed through as higher rent.\n\nThis is preliminary (peer review pending), so read it as such. Data are open and feedback before we submit is very welcome.",
  },
  {
    platform: 'mastodon',
    dayOffset: 2,
    hour: 15,
    minute: 45,
    status: 'brief',
    owner: 'Heidi',
    campaign: 'Methods explainers',
    brief: 'Explain our street-level heat-mapping method so other labs can reuse it, and build credibility with the methods crowd.',
    audience: 'Fellow researchers',
    theme: 'Methods explainer',
    body: "Planning a thread on how we built street-level heat maps from satellite + ground-sensor data, for labs that want to reuse the method. What's the one methods step you always wish papers explained better?",
  },
  {
    platform: 'instagram',
    dayOffset: 3,
    hour: 12,
    minute: 0,
    status: 'scheduled',
    owner: 'Heidi',
    theme: 'Data visualisation',
    evidenceLevel: 'peer_reviewed',
    source: HEAT_PAPER,
    body: 'Same city. Same afternoon. 2°C apart. 🌳 This map shows surface temperature across one of our study cities — the cool blue corridors trace exactly where the street trees are. Swipe for the equity breakdown. Study link in bio.',
    media: { type: 'image', label: 'Figure 2 · city heat map' },
  },
  {
    platform: 'bluesky',
    dayOffset: 3,
    hour: 16,
    minute: 30,
    status: 'failed',
    owner: 'Heidi',
    theme: 'Public engagement',
    body: 'Reminder: our department\'s free public lecture on cities & climate is next Thursday, 6pm — open to all. Bring your questions about heatwaves, trees, and what your local council can actually do.',
  },
  {
    platform: 'threads',
    dayOffset: 4,
    hour: 9,
    minute: 30,
    status: 'draft',
    owner: 'Heidi',
    reviewer: 'Priya Nair',
    theme: 'Commentary',
    hook: "Planting trees won't save us.",
    evidenceLevel: 'opinion',
    body: "Hot take: planting trees won't fix urban heat. Our data proves canopy targets are basically climate theatre unless you fix who actually gets the shade.",
    reviews: [
      {
        decision: 'changes_requested',
        reviewer: 'Priya Nair',
        note: '"Proves" overclaims — the paper shows an association, not proof. Soften to "suggests", and drop "theatre" so it reads as evidence, not a rant.',
      },
    ],
  },
  {
    platform: 'linkedin',
    dayOffset: 4,
    hour: 17,
    minute: 0,
    status: 'draft',
    owner: 'Heidi',
    audience: 'Fellow researchers',
    theme: 'Reflection',
    evidenceLevel: 'opinion',
    body: "An honest reflection: I used to treat public engagement as a distraction from the \"real\" research. Three years of sharing our work later, a city planner has cited our paper in a policy brief, two collaborations started in the replies, and a master's student joined the lab because of a thread.\n\nCommunicating the science is the work. If you're a researcher on the fence about it — consider this your nudge.",
  },
  {
    platform: 'mastodon',
    dayOffset: 5,
    hour: 11,
    minute: 0,
    status: 'approved',
    owner: 'Heidi',
    campaign: 'Public Q&A',
    theme: 'Public engagement',
    body: "It's #AskAScientist Friday 🔬 I study how cities heat up and who feels it most. Ask me anything about heatwaves, urban trees, climate adaptation — or what it's actually like doing this research. I'll answer through the afternoon.",
  },
  {
    platform: 'bluesky',
    dayOffset: 6,
    hour: 17,
    minute: 0,
    status: 'brief',
    owner: 'Heidi',
    campaign: 'Public lecture',
    brief: 'Crowdsource audience questions to shape next week\'s public lecture and signal that we listen.',
    audience: 'General public',
    theme: 'Community',
    body: "Giving a public talk next week on heatwaves and cities. What do you actually want to know? Drop a question and I'll try to work it into the talk.",
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
      brief: seed.brief,
      audience: seed.audience,
      theme: seed.theme,
      hook: seed.hook,
      source: seed.source,
      evidenceLevel: seed.evidenceLevel,
      reviewer: seed.reviewer,
      reviews: seed.reviews?.map((r) => ({ id: createId('review'), at: nowIso, ...r })),
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
  const now = new Date().toISOString();
  return [
    {
      platform: 'bluesky',
      status: 'connected',
      handle: '@heidiandersen.bsky.social',
      displayName: 'Dr. Heidi Andersen',
      followers: 3120,
      lastSyncedAt: now,
    },
    {
      platform: 'mastodon',
      status: 'connected',
      handle: '@heidiandersen@fediscience.org',
      displayName: 'Dr. Heidi Andersen',
      followers: 1840,
      lastSyncedAt: now,
    },
    {
      platform: 'linkedin',
      status: 'connected',
      handle: 'heidi-andersen',
      displayName: 'Heidi Andersen, PhD',
      followers: 4860,
      lastSyncedAt: now,
    },
    {
      platform: 'instagram',
      status: 'connected',
      handle: '@heidi.does.science',
      displayName: 'Heidi does science',
      followers: 2240,
      lastSyncedAt: now,
    },
    {
      platform: 'threads',
      status: 'disconnected',
    },
  ];
}
