import type { Platform } from '../types';

/**
 * Types for the "Generate Ideas" AI feature.
 *
 * Owned by the AI Feature Agent. The `IdeaGenerator` interface is the seam that
 * lets us ship a deterministic mock today and drop in a real LLM client later
 * without changing the UI.
 */

export type Tone =
  | 'professional'
  | 'casual'
  | 'witty'
  | 'inspirational'
  | 'educational'
  | 'bold';

/** User-provided inputs that shape the generated ideas. */
export interface IdeaRequest {
  niche: string;
  audience: string;
  tone: Tone;
  platform: Platform;
}

/** Suggested content format for a post idea. */
export type ContentFormat =
  | 'carousel'
  | 'reel'
  | 'single image'
  | 'text post'
  | 'video'
  | 'poll'
  | 'story';

/** A single structured idea returned by the generator. */
export interface PostIdea {
  id: string;
  topic: string;
  /** Attention-grabbing opening line for the post. */
  hook: string;
  /** Why this idea fits the requested platform. */
  platformFit: string;
  recommendedFormat: ContentFormat;
}

export interface IdeaResponse {
  request: IdeaRequest;
  ideas: PostIdea[];
  /** Identifies which generator produced the result (mock vs. a real model). */
  source: string;
}

/**
 * The contract every idea generator implements. Always returns exactly 5 ideas.
 */
export interface IdeaGenerator {
  readonly name: string;
  generate(request: IdeaRequest): Promise<IdeaResponse>;
}
