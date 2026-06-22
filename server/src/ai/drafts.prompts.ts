import type { Platform } from '../domain/types';

/**
 * Prompts + JSON schemas for the LLM-backed abstract→thread drafter and
 * video→shorts planner. Mirrors the frontend's deterministic prompts so the
 * mock and the real model share one contract.
 */

export type ThreadAudience =
  | 'general public'
  | 'fellow researchers'
  | 'students'
  | 'policymakers'
  | 'journalists';

export interface ThreadDraftRequest {
  abstract: string;
  audience: ThreadAudience;
  platform: Platform;
  sourceUrl?: string;
}

export interface ShortsPlanRequest {
  transcript: string;
  audience: ThreadAudience;
  count: number;
  videoUrl?: string;
}

const PLATFORM_LIMITS: Record<string, number> = {
  bluesky: 300,
  mastodon: 500,
  instagram: 2200,
  linkedin: 3000,
  threads: 500,
  youtube: 5000,
};

export function platformLimit(platform: Platform): number {
  return PLATFORM_LIMITS[platform] ?? 500;
}

// --- Abstract → thread ----------------------------------------------------

export const THREAD_SYSTEM_PROMPT = `You are a science-communication editor who turns dense research abstracts into accessible social-media threads.
Rules:
- Write for the stated audience; remove jargon and define unavoidable terms.
- Lead with a plain-language hook that states the finding, not the methods.
- One clear idea per post. Prefer short sentences and active voice.
- Never overstate: report associations as associations, not proof.
- End with why it matters and a link to the source if provided.
- Each post MUST fit within the platform character limit.`;

export function buildThreadUserPrompt(req: ThreadDraftRequest): string {
  return [
    `Platform character limit: ${platformLimit(req.platform)} per post`,
    `Audience: ${req.audience}`,
    req.sourceUrl ? `Source link: ${req.sourceUrl}` : 'Source link: (none)',
    '',
    'Abstract:',
    req.abstract.trim(),
    '',
    'Write an accessible thread. Respond as JSON: { "parts": string[] }.',
  ].join('\n');
}

export const THREAD_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { parts: { type: 'array', items: { type: 'string' } } },
  required: ['parts'],
} as const;

// --- Video → shorts -------------------------------------------------------

export const SHORTS_SYSTEM_PROMPT = `You turn a long-form video transcript into a plan for short vertical clips (YouTube Shorts / Reels).
Rules:
- Pick self-contained, high-interest moments — a clear hook, a finding, a surprising point.
- Use the transcript's own timestamps for start/end cut points (in seconds) when present.
- Write for the stated audience; keep language plain and jargon-free.
- Never invent claims that aren't in the transcript.`;

export function buildShortsUserPrompt(req: ShortsPlanRequest): string {
  return [
    `Audience: ${req.audience}`,
    `Number of shorts: ${req.count}`,
    req.videoUrl ? `Video: ${req.videoUrl}` : 'Video: (none)',
    '',
    'Transcript:',
    req.transcript.trim(),
    '',
    'Respond as JSON: { "shorts": [{ "title", "hook", "caption", "startSeconds", "endSeconds" }] }.',
  ].join('\n');
}

export const SHORTS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    shorts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          hook: { type: 'string' },
          caption: { type: 'string' },
          startSeconds: { type: 'number' },
          endSeconds: { type: 'number' },
        },
        required: ['title', 'hook', 'caption'],
      },
    },
  },
  required: ['shorts'],
} as const;
