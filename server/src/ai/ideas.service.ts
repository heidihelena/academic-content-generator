import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { VaultService } from '../vault/vault.service';
import { IDEA_GENERATOR, type IdeaGenerator, type IdeaRequest, type IdeaResponse } from './ideas.types';

@Injectable()
export class IdeasService {
  constructor(
    @Inject(IDEA_GENERATOR) private readonly generator: IdeaGenerator,
    private readonly vault: VaultService,
  ) {}

  /**
   * Generates 5 ideas, grounding them in the brand's vault via semantic search
   * (RAG): retrieve the most relevant notes, pass them to the generator as
   * context, and report which sources informed the result.
   */
  async generate(request: IdeaRequest): Promise<IdeaResponse> {
    if (!request.niche?.trim() || !request.audience?.trim()) {
      throw new BadRequestException('niche and audience are required');
    }

    const query = `${request.niche} for ${request.audience} (${request.tone}, ${request.platform})`;
    const hits = await this.vault.search(query, 4);
    const relevant = hits.filter((h) => h.score > 0.15);

    const context = relevant.map((h) => `${h.title ? h.title + ': ' : ''}${h.content}`.slice(0, 600));
    const groundedOnSources = [...new Set(relevant.map((h) => h.source))];

    const ideas = await this.generator.generate(request, context);

    return { request, ideas, source: this.generator.name, groundedOnSources };
  }
}
