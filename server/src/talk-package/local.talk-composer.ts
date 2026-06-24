import { ContentPlan, ContentPoint } from '../content-plan/content-plan.types';
import {
  ShortComposeOptions,
  TalkComposeOptions,
  TalkComposer,
} from './talk-composer.types';
import { renderShort, renderTalk } from './talk-render';

/**
 * Deterministic local composer — renders the talk/short scaffolds. Always
 * available (zero config) and the fallback for the Claude-backed composer.
 */
export class LocalTalkComposer implements TalkComposer {
  readonly name = 'local';

  async composeTalk(plan: ContentPlan, opts: TalkComposeOptions): Promise<string> {
    return renderTalk(plan, opts).body;
  }

  async composeShort(
    plan: ContentPlan,
    point: ContentPoint,
    index: number,
    opts: ShortComposeOptions,
  ): Promise<string> {
    return renderShort(plan, point, index, opts);
  }
}
