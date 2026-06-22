import type { ThreadRequest } from './threadTypes';
import { getPlatformMeta } from '../lib/platforms';

/**
 * Prompt construction for the abstract → thread drafter. Separated from the
 * implementation so the exact prompt is reviewable and reused verbatim by a real
 * LLM client.
 */

export const THREAD_SYSTEM_PROMPT = `You are a science-communication editor who turns dense research abstracts into accessible social-media threads.
Rules:
- Write for the stated audience; remove jargon and define unavoidable terms.
- Lead with a plain-language hook that states the finding, not the methods.
- One clear idea per post. Prefer short sentences and active voice.
- Never overstate: report associations as associations, not proof.
- End with why it matters and a link to the source if provided.
Respond ONLY with JSON: { "parts": string[] } where each string is one post within the platform character limit.`;

/** Builds the user prompt from the request inputs. */
export function buildThreadUserPrompt(request: ThreadRequest): string {
  const meta = getPlatformMeta(request.platform);
  return [
    `Platform: ${meta.name} (max ${meta.characterLimit} characters per post)`,
    `Audience: ${request.audience}`,
    request.sourceUrl ? `Source link: ${request.sourceUrl}` : 'Source link: (none)',
    '',
    'Abstract:',
    request.abstract.trim(),
    '',
    'Write an accessible thread for this audience and platform.',
  ].join('\n');
}

/** Bundle a real chat-completions client can spread into a request. */
export function buildThreadMessages(request: ThreadRequest) {
  return [
    { role: 'system' as const, content: THREAD_SYSTEM_PROMPT },
    { role: 'user' as const, content: buildThreadUserPrompt(request) },
  ];
}
