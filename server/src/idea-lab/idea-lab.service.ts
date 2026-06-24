import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AUDIENCES, Audience, CONTENT_CHANNELS, ContentChannel } from '../domain/academic';
import { IDEA_GENERATOR, type IdeaGenerator, type IdeaRequest } from '../ai/ideas.types';
import { SourcesService } from '../sources/sources.service';

/** One academic content idea derived from a source. */
export interface AcademicIdea {
  id: string;
  /** The angle / topic to write about. */
  angle: string;
  /** The opening hook. */
  hook: string;
  /** Suggested output channel. */
  channel: ContentChannel;
  /** Suggested audience. */
  audience: Audience;
}

export interface IdeaLabResult {
  sourceId: string;
  ideas: AcademicIdea[];
  /** Which generator produced the ideas (mock by default, llm when configured). */
  generator: string;
}

/**
 * Academic Idea Lab (issue #29): given a source, generate 5 content ideas.
 *
 * Composes the existing, configured idea generator (`IDEA_GENERATOR`, mock by
 * default) — the source's title/abstract/body/tags are passed as grounding
 * context, so this works with zero config and upgrades to the LLM generator
 * automatically when one is configured. The existing `IdeasService` public API
 * is left untouched.
 */
@Injectable()
export class IdeaLabService {
  constructor(
    @Inject(IDEA_GENERATOR) private readonly generator: IdeaGenerator,
    private readonly sources: SourcesService,
  ) {}

  async generate(sourceId: string, audience: Audience = 'peers'): Promise<IdeaLabResult> {
    const aud: Audience = AUDIENCES.includes(audience) ? audience : 'peers';
    const source = await this.sources.get(sourceId); // throws 404 if missing

    const request: IdeaRequest = {
      niche: source.title,
      audience: aud,
      tone: 'educational',
      platform: 'linkedin',
    };
    const context = [
      source.title,
      source.abstract,
      source.body,
      source.tags.length ? `Tags: ${source.tags.join(', ')}` : undefined,
    ]
      .filter((s): s is string => Boolean(s && s.trim()))
      .map((s) => s.slice(0, 600));

    const ideas = await this.generator.generate(request, context);

    return {
      sourceId,
      generator: this.generator.name,
      // Suggest a different channel per idea for variety; audience follows the request.
      ideas: ideas.map((idea, i) => ({
        id: `idea_${randomUUID()}`,
        angle: idea.topic,
        hook: idea.hook,
        channel: CONTENT_CHANNELS[i % CONTENT_CHANNELS.length],
        audience: aud,
      })),
    };
  }
}
