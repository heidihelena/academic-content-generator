import type { IdeaRequest } from './types';
import { getPlatformMeta } from '../lib/platforms';

/**
 * Prompt construction for the Generate Ideas feature.
 *
 * This is intentionally separated from the generator implementation so the exact
 * prompt is reviewable, testable, and reused verbatim by a real LLM client.
 */

/** System prompt: defines the assistant's role and strict output contract. */
export const IDEA_SYSTEM_PROMPT = `You are a senior social media strategist for vahtian.com.
You produce concise, high-performing post ideas tailored to a specific platform, niche, audience and tone.
Always return exactly 5 distinct ideas.
For each idea provide: a topic, a scroll-stopping hook (one sentence), a short platform-fit rationale, and a recommended content format.
Respond ONLY with JSON matching this schema:
{
  "ideas": [
    { "topic": string, "hook": string, "platformFit": string, "recommendedFormat": "carousel"|"reel"|"single image"|"text post"|"video"|"poll"|"story" }
  ]
}`;

/** Builds the user prompt from the request inputs. */
export function buildIdeaUserPrompt(request: IdeaRequest): string {
  const meta = getPlatformMeta(request.platform);
  return [
    `Platform: ${meta.name} (max ${meta.characterLimit} characters per post)`,
    `Niche: ${request.niche}`,
    `Target audience: ${request.audience}`,
    `Tone: ${request.tone}`,
    '',
    'Generate 5 post ideas optimized for this platform and audience.',
  ].join('\n');
}

/** Convenience bundle a real chat-completions client can spread into a request. */
export function buildIdeaMessages(request: IdeaRequest) {
  return [
    { role: 'system' as const, content: IDEA_SYSTEM_PROMPT },
    { role: 'user' as const, content: buildIdeaUserPrompt(request) },
  ];
}
