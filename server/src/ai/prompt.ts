import type { IdeaRequest } from './ideas.types';

const PLATFORM_LIMITS: Record<string, number> = {
  bluesky: 300,
  mastodon: 500,
  instagram: 2200,
  linkedin: 3000,
  threads: 500,
  youtube: 5000,
};

/** System prompt: role + strict JSON output contract. */
export const IDEA_SYSTEM_PROMPT = `You are a senior social media strategist for vahtian.com.
You produce concise, high-performing post ideas tailored to a specific platform, niche, audience and tone.
When background notes from the brand's own content vault are provided, ground your ideas in that material and reuse its voice.
Always return exactly 5 distinct ideas.
For each idea provide: a topic, a scroll-stopping one-sentence hook, a short platform-fit rationale, and a recommended content format
(one of: carousel, reel, single image, text post, video, poll, story).`;

/** JSON schema for structured outputs (output_config.format). */
export const IDEA_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          topic: { type: 'string' },
          hook: { type: 'string' },
          platformFit: { type: 'string' },
          recommendedFormat: {
            type: 'string',
            enum: ['carousel', 'reel', 'single image', 'text post', 'video', 'poll', 'story'],
          },
        },
        required: ['topic', 'hook', 'platformFit', 'recommendedFormat'],
      },
    },
  },
  required: ['ideas'],
} as const;

/** Builds the user prompt, weaving in any retrieved vault context (RAG). */
export function buildIdeaUserPrompt(request: IdeaRequest, context: string[]): string {
  const limit = PLATFORM_LIMITS[request.platform] ?? 1000;
  const lines = [
    `Platform: ${request.platform} (max ${limit} characters per post)`,
    `Niche: ${request.niche}`,
    `Target audience: ${request.audience}`,
    `Tone: ${request.tone}`,
  ];
  if (context.length > 0) {
    lines.push('', 'Relevant notes from the brand content vault:');
    context.forEach((c, i) => lines.push(`[${i + 1}] ${c}`));
  }
  lines.push('', 'Generate 5 post ideas optimized for this platform and audience.');
  return lines.join('\n');
}
