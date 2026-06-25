import { randomUUID } from 'crypto';
import type { LlmClient } from '../llm-client';
import type { ContentFormat, IdeaGenerator, IdeaRequest, PostIdea } from '../ideas.types';
import { IDEA_JSON_SCHEMA, IDEA_SYSTEM_PROMPT, buildIdeaUserPrompt } from '../prompt';
import { MockIdeaGenerator } from './mock.generator';

/**
 * LLM-backed idea generator (Claude or a local Ollama model, via {@link LlmClient}),
 * selected when IDEA_GENERATOR=llm. The client returns JSON validated against
 * IDEA_JSON_SCHEMA. Any error — or an empty result — falls back to the
 * deterministic mock generator, so the endpoint never fails.
 */
export class LlmIdeaGenerator implements IdeaGenerator {
  readonly name: string;
  private readonly fallback = new MockIdeaGenerator();

  constructor(private readonly client: LlmClient) {
    this.name = client.name;
  }

  async generate(request: IdeaRequest, context: string[]): Promise<PostIdea[]> {
    try {
      const parsed = await this.client.completeJson<{
        ideas: Array<{
          topic: string;
          hook: string;
          platformFit: string;
          recommendedFormat: ContentFormat;
        }>;
      }>({
        system: IDEA_SYSTEM_PROMPT,
        user: buildIdeaUserPrompt(request, context),
        schema: IDEA_JSON_SCHEMA,
        maxTokens: 2048,
      });
      const ideas = parsed.ideas
        ?.slice(0, 5)
        .map((idea) => ({ id: `idea_${randomUUID()}`, ...idea }));
      if (ideas?.length) return ideas;
    } catch {
      // fall through to the deterministic mock generator
    }
    return this.fallback.generate(request, context);
  }
}
