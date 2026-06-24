import { ApiClient } from '../lib/api';
import { composeDraft } from './studioDraft';
import { reviewDraft } from './studioReview';
import type { ReviewState, StudioAudience, StudioInput } from './studioTypes';

/**
 * Draft Studio engine — composes a draft and reviews it. Two implementations,
 * chosen by `VITE_API_URL`:
 *  - `LocalStudioEngine` — the deterministic local mirror (offline + tests).
 *  - `ApiStudioEngine` — the backend (`/draft-studio`, `/safety/review`), so the
 *    UI uses the authoritative server safety review (and a real LLM draft once
 *    configured). It falls back to local on any error, so the flow never breaks.
 */
export interface StudioEngine {
  suggestHook(input: StudioInput): Promise<string>;
  compose(input: StudioInput): Promise<string>;
  review(body: string, audience: StudioAudience): Promise<ReviewState>;
}

function localHook(input: StudioInput): string {
  return input.hook.trim() || `New from our work: ${input.title.trim()}`;
}

export class LocalStudioEngine implements StudioEngine {
  async suggestHook(input: StudioInput): Promise<string> {
    return localHook(input);
  }
  async compose(input: StudioInput): Promise<string> {
    return composeDraft(input);
  }
  async review(body: string, audience: StudioAudience): Promise<ReviewState> {
    return reviewDraft(body, audience);
  }
}

export class ApiStudioEngine implements StudioEngine {
  private readonly local = new LocalStudioEngine();

  constructor(private readonly api: ApiClient) {}

  async suggestHook(input: StudioInput): Promise<string> {
    // The backend hook composer needs a stored source; otherwise stay local.
    if (!input.sourceId) return this.local.suggestHook(input);
    try {
      const out = await this.api.post<{ hook?: string }>('/draft-studio/hook', {
        sourceId: input.sourceId,
        channel: input.channel,
        audience: input.audience,
      });
      if (out.hook?.trim()) return out.hook.trim();
    } catch {
      // fall through to the local hook
    }
    return this.local.suggestHook(input);
  }

  async compose(input: StudioInput): Promise<string> {
    // The backend Draft Studio composes from a stored source; without one we
    // can't call it, so use the identical local composer.
    if (!input.sourceId) return this.local.compose(input);
    try {
      const out = await this.api.post<{ body?: string }>('/draft-studio', {
        sourceId: input.sourceId,
        channel: input.channel,
        audience: input.audience,
        idea: input.hook.trim() ? { hook: input.hook, angle: input.title } : undefined,
      });
      return out.body ?? this.local.compose(input);
    } catch {
      return this.local.compose(input);
    }
  }

  async review(body: string, audience: StudioAudience): Promise<ReviewState> {
    try {
      const result = await this.api.post<ReviewState>('/safety/review', { body, audience });
      if (result && Array.isArray(result.findings) && Array.isArray(result.claims)) {
        return result;
      }
    } catch {
      // fall through to the local reviewer
    }
    return this.local.review(body, audience);
  }
}

function createDefault(): StudioEngine {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiStudioEngine(new ApiClient(baseUrl)) : new LocalStudioEngine();
}

let active: StudioEngine = createDefault();

/** Override the active engine (used by tests). */
export function setStudioEngine(engine: StudioEngine): void {
  active = engine;
}

export function suggestStudioHook(input: StudioInput): Promise<string> {
  return active.suggestHook(input);
}

export function composeStudioDraft(input: StudioInput): Promise<string> {
  return active.compose(input);
}

export function reviewStudioDraft(body: string, audience: StudioAudience): Promise<ReviewState> {
  return active.review(body, audience);
}
