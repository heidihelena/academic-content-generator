import { ApiClient } from '../lib/api';
import type { Audience } from '../content/contentTypes';

/**
 * Idea Lab client — turns one source into 5 content ideas (angle + hook +
 * suggested channel/audience). Mirrors the backend `/idea-lab` and follows the
 * same swap-by-config facade as the sources/vault clients:
 *
 *  - `LocalIdeaLabClient` — deterministic, dependency-free idea templating from
 *    the source's title + material. Works offline and in tests.
 *  - `ApiIdeaLabClient` — `POST /idea-lab` (composes the configured generator —
 *    mock by default, Claude when `IDEA_GENERATOR=llm`). Selected when
 *    `VITE_API_URL` is set.
 *
 * Switching backends is a config change, not a UI change.
 */

/** Output channels — mirrors the server's `CONTENT_CHANNELS`. */
export const CONTENT_CHANNELS = [
  'linkedin',
  'bluesky',
  'threads',
  'instagram',
  'newsletter',
  'teaching',
  'talk',
  'shorts',
] as const;
export type ContentChannel = (typeof CONTENT_CHANNELS)[number];

/** One generated idea — mirrors the server's `AcademicIdea`. */
export interface AcademicIdea {
  id: string;
  /** The angle / topic to write about. */
  angle: string;
  /** The opening hook. */
  hook: string;
  channel: ContentChannel;
  audience: Audience;
}

/** Result of an Idea Lab run — mirrors the server's `IdeaLabResult`. */
export interface IdeaLabResult {
  sourceId: string;
  ideas: AcademicIdea[];
  /** Which generator produced the ideas (mock by default, llm when configured). */
  generator: string;
}

/**
 * The minimum a source needs to seed ideas. The API client uses only `id`
 * (the backend looks the source up server-side); the local client templates
 * from `title` + `material`.
 */
export interface IdeaSeed {
  id: string;
  title: string;
  material: string;
}

export interface IdeaLabClient {
  generate(seed: IdeaSeed, audience?: Audience): Promise<IdeaLabResult>;
}

// Deterministic local templates — five distinct angles, one hook each.
const ANGLES: ((title: string) => string)[] = [
  (t) => `What "${t}" actually shows`,
  (t) => `The one finding from "${t}" worth sharing`,
  (t) => `A common misconception "${t}" corrects`,
  (t) => `How to explain "${t}" to a non-specialist`,
  (t) => `Why "${t}" matters beyond the lab`,
];
const HOOKS = [
  'Most people get this wrong:',
  'A counterintuitive result:',
  'Here is the part that surprised me:',
  'If you remember one thing:',
  'The practical takeaway:',
];

/** Local, dependency-free idea generator (deterministic for a given source). */
export class LocalIdeaLabClient implements IdeaLabClient {
  async generate(seed: IdeaSeed, audience: Audience = 'peers'): Promise<IdeaLabResult> {
    const title = seed.title.trim() || 'this source';
    const snippet = seed.material.trim().slice(0, 140);
    const ideas: AcademicIdea[] = ANGLES.map((angle, i) => ({
      id: `idea_local_${i}`,
      angle: angle(title),
      hook: snippet ? `${HOOKS[i]} ${snippet}${seed.material.length > 140 ? '…' : ''}` : HOOKS[i],
      channel: CONTENT_CHANNELS[i % CONTENT_CHANNELS.length],
      audience,
    }));
    return { sourceId: seed.id, ideas, generator: 'local-template-v1' };
  }
}

/** Remote Idea Lab client backed by the NestJS API. */
export class ApiIdeaLabClient implements IdeaLabClient {
  constructor(private readonly api: ApiClient) {}

  generate(seed: IdeaSeed, audience: Audience = 'peers'): Promise<IdeaLabResult> {
    return this.api.post<IdeaLabResult>('/idea-lab', { sourceId: seed.id, audience });
  }
}

function createDefault(): IdeaLabClient {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return baseUrl ? new ApiIdeaLabClient(new ApiClient(baseUrl)) : new LocalIdeaLabClient();
}

let active: IdeaLabClient = createDefault();

/** Override the active client (used by tests). */
export function setIdeaLabClient(client: IdeaLabClient): void {
  active = client;
}

export function generateIdeasFromSource(seed: IdeaSeed, audience?: Audience): Promise<IdeaLabResult> {
  return active.generate(seed, audience);
}
