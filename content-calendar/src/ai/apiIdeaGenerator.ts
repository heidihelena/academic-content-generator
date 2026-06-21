import type { ApiClient } from '../lib/api';
import type { IdeaGenerator, IdeaRequest, IdeaResponse } from './types';

/**
 * Idea generator that delegates to the backend's `POST /ai/ideas` (which runs
 * the RAG-grounded generator server-side). Wired in via `setIdeaGenerator` when
 * the app runs in API mode — see `bootstrap.ts`.
 */
export class ApiIdeaGenerator implements IdeaGenerator {
  readonly name = 'api-generator';

  constructor(private readonly api: ApiClient) {}

  async generate(request: IdeaRequest): Promise<IdeaResponse> {
    const res = await this.api.post<IdeaResponse>('/ai/ideas', request);
    // Carry the backend's reported source (e.g. mock-generator-v1 / claude-…).
    return { request, ideas: res.ideas, source: res.source ?? this.name };
  }
}
