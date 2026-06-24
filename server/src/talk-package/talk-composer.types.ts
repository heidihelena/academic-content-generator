import { Audience } from '../domain/academic';
import { ContentPlan, ContentPoint } from '../content-plan/content-plan.types';

export interface TalkComposeOptions {
  durationMin: number;
  audience: Audience;
  /** Descriptors of content already made from this source — avoid repeating it. */
  priorContext?: string[];
}

export interface ShortComposeOptions {
  audience: Audience;
  url?: string;
}

/**
 * Writes a long-form talk script and per-point short scripts from a
 * {@link ContentPlan}. Two implementations exist (deterministic local scaffold;
 * Claude-backed prose), selected by configuration — the same swap-by-config
 * pattern as the draft composer and idea generator.
 */
export interface TalkComposer {
  readonly name: string;
  composeTalk(plan: ContentPlan, opts: TalkComposeOptions): Promise<string>;
  composeShort(
    plan: ContentPlan,
    point: ContentPoint,
    index: number,
    opts: ShortComposeOptions,
  ): Promise<string>;
}

export const TALK_COMPOSER = Symbol('TALK_COMPOSER');
