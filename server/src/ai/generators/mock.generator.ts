import { randomUUID } from 'crypto';
import type { ContentFormat, IdeaGenerator, IdeaRequest, PostIdea, Tone } from '../ideas.types';

const TONE_PREFIX: Record<Tone, string> = {
  professional: '',
  casual: 'Real talk: ',
  witty: 'Plot twist: ',
  inspirational: 'Imagine this: ',
  educational: 'Quick lesson: ',
  bold: 'Unpopular opinion: ',
};

const FORMATS: Record<IdeaRequest['platform'], ContentFormat[]> = {
  bluesky: ['text post', 'poll', 'single image', 'text post', 'video'],
  mastodon: ['text post', 'poll', 'single image', 'text post', 'carousel'],
  instagram: ['carousel', 'reel', 'single image', 'story', 'carousel'],
  linkedin: ['text post', 'carousel', 'poll', 'single image', 'text post'],
  threads: ['text post', 'poll', 'single image', 'text post', 'video'],
  x: ['text post', 'poll', 'single image', 'text post', 'video'],
  youtube: ['video', 'reel', 'video', 'single image', 'video'],
};

/** Deterministic, offline idea generator. Mirrors the LLM contract so the API
 *  is fully usable with no key, and is the default when IDEA_GENERATOR=mock. */
export class MockIdeaGenerator implements IdeaGenerator {
  readonly name = 'mock-generator-v1';

  async generate(request: IdeaRequest, context: string[]): Promise<PostIdea[]> {
    const tone = TONE_PREFIX[request.tone];
    const grounded = context.length > 0 ? ' (grounded in your vault)' : '';
    const angles = [
      `Myth-busting common misconceptions in ${request.niche}`,
      `Behind the scenes: how we approach ${request.niche}`,
      `${request.audience}'s top 5 questions about ${request.niche}, answered`,
      `A quick win your ${request.audience.toLowerCase()} can try today`,
      `The future of ${request.niche} for ${request.audience.toLowerCase()}`,
    ];
    return angles.map((topic, i) => ({
      id: `idea_${randomUUID()}`,
      topic,
      hook: `${tone}Here's what most people get wrong about ${request.niche}.`,
      platformFit: `Fits ${request.platform}${grounded}.`,
      recommendedFormat: FORMATS[request.platform][i % 5],
    }));
  }
}
