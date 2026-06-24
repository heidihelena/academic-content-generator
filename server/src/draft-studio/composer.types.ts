import { Audience, ContentChannel } from '../domain/academic';

/** Everything a composer needs to write a hook or a draft. */
export interface ComposeRequest {
  title: string;
  /** Source material (abstract / notes) to draft from. */
  material: string;
  channel: ContentChannel;
  audience: Audience;
  /** An existing hook to reuse, if the author supplied one. */
  hook?: string;
  /** An angle to steer the draft. */
  angle?: string;
}

/**
 * Writes the opening hook and the full draft for a piece of content. Two
 * implementations exist (deterministic local; Claude-backed), selected by
 * configuration — the same swap-by-config pattern as the idea generator.
 */
export interface DraftComposer {
  readonly name: string;
  composeHook(req: ComposeRequest): Promise<string>;
  composeDraft(req: ComposeRequest): Promise<string>;
}

export const DRAFT_COMPOSER = Symbol('DRAFT_COMPOSER');
