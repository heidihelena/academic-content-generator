import type { ShortsRequest } from './shortsTypes';

/**
 * Prompt construction for the Video → Shorts planner. Separated from the
 * implementation so the exact prompt is reviewable and reused by a real LLM.
 */

export const SHORTS_SYSTEM_PROMPT = `You turn a long-form video transcript into a plan for short vertical clips (YouTube Shorts / Reels).
Rules:
- Pick self-contained, high-interest moments — a clear hook, a finding, a surprising point.
- Use the transcript's own timestamps for start/end cut points when present.
- Write for the stated audience; keep language plain and jargon-free.
- Never invent claims that aren't in the transcript.
For each clip provide a short title, an opening hook, a caption, and start/end seconds.
Respond ONLY with JSON: { "shorts": [{ "title": string, "hook": string, "caption": string, "startSeconds": number, "endSeconds": number }] }.`;

export function buildShortsUserPrompt(request: ShortsRequest): string {
  return [
    `Audience: ${request.audience}`,
    `Number of shorts: ${request.count}`,
    request.videoUrl ? `Video: ${request.videoUrl}` : 'Video: (none)',
    '',
    'Transcript:',
    request.transcript.trim(),
    '',
    `Propose up to ${request.count} short clips.`,
  ].join('\n');
}

export function buildShortsMessages(request: ShortsRequest) {
  return [
    { role: 'system' as const, content: SHORTS_SYSTEM_PROMPT },
    { role: 'user' as const, content: buildShortsUserPrompt(request) },
  ];
}
