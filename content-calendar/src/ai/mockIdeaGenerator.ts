import { createId } from '../lib/id';
import { getPlatformMeta } from '../lib/platforms';
import type {
  ContentFormat,
  IdeaGenerator,
  IdeaRequest,
  IdeaResponse,
  PostIdea,
  Tone,
} from './types';
import { buildIdeaUserPrompt } from './prompt';

/**
 * Deterministic, offline idea generator used when no real LLM is configured.
 *
 * It produces 5 structured, on-brand ideas by combining the user's inputs with
 * a small set of proven content angles. Output is deterministic for a given
 * request, which keeps the feature demoable offline and trivially testable.
 */

const ANGLES: Array<{
  topic: (r: IdeaRequest) => string;
  hook: (r: IdeaRequest) => string;
  fit: (platform: string) => string;
}> = [
  {
    topic: (r) => `Myth-busting common misconceptions in ${r.niche}`,
    hook: (r) => `Stop believing this about ${r.niche} — here's what actually works.`,
    fit: (p) => `${p} rewards contrarian takes that spark comments and saves.`,
  },
  {
    topic: (r) => `A behind-the-scenes look at how we approach ${r.niche}`,
    hook: () => `Ever wondered what really happens behind the curtain?`,
    fit: (p) => `Authentic, candid content over-performs on ${p}.`,
  },
  {
    topic: (r) => `${r.audience}'s top 5 questions about ${r.niche}, answered`,
    hook: (r) => `The 5 questions every ${r.audience.toLowerCase()} is afraid to ask.`,
    fit: (p) => `Listicles are highly shareable and saveable on ${p}.`,
  },
  {
    topic: (r) => `A quick win your ${r.audience.toLowerCase()} can try today in ${r.niche}`,
    hook: () => `Try this for 5 minutes today — thank me tomorrow.`,
    fit: (p) => `Actionable, bite-sized value drives shares on ${p}.`,
  },
  {
    topic: (r) => `The future of ${r.niche}: what's changing for ${r.audience.toLowerCase()}`,
    hook: (r) => `${r.niche} won't look the same in 12 months. Here's why.`,
    fit: (p) => `Forward-looking thought leadership builds authority on ${p}.`,
  },
];

/** Maps tone to a hook prefix so the assistant "voice" reflects the input. */
const TONE_PREFIX: Record<Tone, string> = {
  professional: '',
  casual: 'Real talk: ',
  witty: 'Plot twist: ',
  inspirational: 'Imagine this: ',
  educational: 'Quick lesson: ',
  bold: 'Unpopular opinion: ',
};

/** Picks a recommended format that suits the platform. */
function formatForPlatform(platform: IdeaRequest['platform'], index: number): ContentFormat {
  const byPlatform: Record<IdeaRequest['platform'], ContentFormat[]> = {
    bluesky: ['text post', 'poll', 'single image', 'text post', 'video'],
    mastodon: ['text post', 'poll', 'single image', 'text post', 'carousel'],
    instagram: ['carousel', 'reel', 'single image', 'story', 'carousel'],
    linkedin: ['text post', 'carousel', 'poll', 'single image', 'text post'],
    threads: ['text post', 'poll', 'single image', 'text post', 'video'],
  };
  const list = byPlatform[platform];
  return list[index % list.length];
}

export class MockIdeaGenerator implements IdeaGenerator {
  readonly name = 'mock-generator-v1';

  async generate(request: IdeaRequest): Promise<IdeaResponse> {
    // Build the prompt even though we don't send it — this validates the prompt
    // path and mirrors what a real client would do before the API call.
    void buildIdeaUserPrompt(request);

    const platformName = getPlatformMeta(request.platform).name;
    const tonePrefix = TONE_PREFIX[request.tone];

    // Simulate model latency so the UI's loading state is exercised.
    await new Promise((r) => setTimeout(r, 600));

    if (!request.niche.trim() || !request.audience.trim()) {
      throw new Error('Please provide both a niche and a target audience.');
    }

    const ideas: PostIdea[] = ANGLES.map((angle, i) => ({
      id: createId('idea'),
      topic: angle.topic(request),
      hook: `${tonePrefix}${angle.hook(request)}`,
      platformFit: angle.fit(platformName),
      recommendedFormat: formatForPlatform(request.platform, i),
    }));

    return { request, ideas, source: this.name };
  }
}
