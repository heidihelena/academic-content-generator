import type { Platform } from '../domain/types';

export type Tone =
  | 'professional'
  | 'casual'
  | 'witty'
  | 'inspirational'
  | 'educational'
  | 'bold';

export type ContentFormat =
  | 'carousel'
  | 'reel'
  | 'single image'
  | 'text post'
  | 'video'
  | 'poll'
  | 'story';

export interface IdeaRequest {
  niche: string;
  audience: string;
  tone: Tone;
  platform: Platform;
}

export interface PostIdea {
  id: string;
  topic: string;
  hook: string;
  platformFit: string;
  recommendedFormat: ContentFormat;
}

export interface IdeaResponse {
  request: IdeaRequest;
  ideas: PostIdea[];
  /** Which generator produced the result, and whether vault context was used. */
  source: string;
  groundedOnSources: string[];
}

export const IDEA_GENERATOR = Symbol('IDEA_GENERATOR');

/** Always returns exactly 5 ideas. `context` is optional retrieved vault text. */
export interface IdeaGenerator {
  readonly name: string;
  generate(request: IdeaRequest, context: string[]): Promise<PostIdea[]>;
}
