import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type { ContentFormat, IdeaGenerator, IdeaRequest, PostIdea } from '../ideas.types';
import { IDEA_JSON_SCHEMA, IDEA_SYSTEM_PROMPT, buildIdeaUserPrompt } from '../prompt';

/**
 * Real idea generator backed by Claude via the Anthropic SDK.
 *
 * Uses adaptive thinking and structured outputs (output_config.format) so the
 * model returns JSON that validates against IDEA_JSON_SCHEMA. Selected when
 * IDEA_GENERATOR=llm and ANTHROPIC_API_KEY is set.
 */
export class LlmIdeaGenerator implements IdeaGenerator {
  readonly name = 'claude-idea-generator';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(request: IdeaRequest, context: string[]): Promise<PostIdea[]> {
    // `output_config` and adaptive `thinking` are passed through; cast the params
    // so the call is tolerant of SDK type-version drift in this scaffold.
    const params = {
      model: this.model,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema: IDEA_JSON_SCHEMA } },
      system: IDEA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildIdeaUserPrompt(request, context) }],
    };

    const message = (await this.client.messages.create(params as never)) as {
      content: Array<{ type: string; text?: string }>;
    };

    const text = message.content.find((b) => b.type === 'text')?.text ?? '{"ideas":[]}';
    const parsed = JSON.parse(text) as {
      ideas: Array<{
        topic: string;
        hook: string;
        platformFit: string;
        recommendedFormat: ContentFormat;
      }>;
    };

    return parsed.ideas.slice(0, 5).map((idea) => ({ id: `idea_${randomUUID()}`, ...idea }));
  }
}
