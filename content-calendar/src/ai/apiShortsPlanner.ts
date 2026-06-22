import type { ApiClient } from '../lib/api';
import type { ShortIdea, ShortsPlanner, ShortsPlanResult, ShortsRequest } from './shortsTypes';
import { MockShortsPlanner } from './mockShortsPlanner';
import { formatTimestamp } from '../lib/shorts';
import { createId } from '../lib/id';

interface ApiShort {
  title: string;
  hook: string;
  caption: string;
  startSeconds?: number;
  endSeconds?: number;
}

/**
 * Shorts planner that uses the backend's LLM (`POST /ai/shorts`) when available,
 * falling back to the deterministic local planner otherwise.
 */
export class ApiShortsPlanner implements ShortsPlanner {
  readonly name = 'api-shorts-planner';
  private readonly fallback = new MockShortsPlanner();

  constructor(private readonly api: ApiClient) {}

  async plan(request: ShortsRequest): Promise<ShortsPlanResult> {
    try {
      const res = await this.api.post<{ shorts: ApiShort[]; source?: string }>('/ai/shorts', {
        transcript: request.transcript,
        audience: request.audience,
        count: request.count,
        videoUrl: request.videoUrl,
      });
      if (res.shorts?.length) {
        const shorts: ShortIdea[] = res.shorts.map((s) => ({
          id: createId('short'),
          title: s.title,
          hook: s.hook,
          caption: s.caption,
          startSeconds: s.startSeconds,
          endSeconds: s.endSeconds,
          timeRange:
            s.startSeconds !== undefined && s.endSeconds !== undefined
              ? `${formatTimestamp(s.startSeconds)}–${formatTimestamp(s.endSeconds)}`
              : undefined,
        }));
        return { request, shorts, source: res.source ?? this.name };
      }
    } catch {
      // Backend has no LLM key / errored — use the local heuristic planner.
    }
    return this.fallback.plan(request);
  }
}
