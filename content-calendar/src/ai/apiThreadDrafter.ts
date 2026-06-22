import type { ApiClient } from '../lib/api';
import type { ThreadDrafter, ThreadDraftResult, ThreadRequest } from './threadTypes';
import { MockThreadDrafter } from './mockThreadDrafter';

/**
 * Thread drafter that uses the backend's LLM (`POST /ai/thread`) when available,
 * and falls back to the deterministic local drafter if the backend has no LLM
 * configured or the call fails — so the feature always works.
 */
export class ApiThreadDrafter implements ThreadDrafter {
  readonly name = 'api-thread-drafter';
  private readonly fallback = new MockThreadDrafter();

  constructor(private readonly api: ApiClient) {}

  async draft(request: ThreadRequest): Promise<ThreadDraftResult> {
    try {
      const res = await this.api.post<{ parts: string[]; source?: string }>('/ai/thread', {
        abstract: request.abstract,
        audience: request.audience,
        platform: request.platform,
        sourceUrl: request.sourceUrl,
      });
      if (res.parts?.length) {
        return { request, parts: res.parts, source: res.source ?? this.name };
      }
    } catch {
      // Backend has no LLM key / errored — use the local heuristic drafter.
    }
    return this.fallback.draft(request);
  }
}
