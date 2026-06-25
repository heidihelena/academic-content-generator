import { LlmClient, LlmCompletion } from '../ai/llm-client';
import { ContentPlan } from '../content-plan/content-plan.types';
import { LlmTalkComposer } from './llm.talk-composer';
import { renderTalk } from './talk-render';

const plan: ContentPlan = {
  sourceId: 's',
  hook: 'Trees and heat',
  points: [{ claim: 'Canopy was associated with cooler streets.' }],
  cta: 'Read it.',
};
const opts = { durationMin: 12, audience: 'peers' as const };

/** A stub {@link LlmClient} whose completeJson is driven by `complete`. */
function stubClient(complete: (req: LlmCompletion) => unknown): LlmClient {
  return {
    name: 'stub',
    completeJson: async <T>(req: LlmCompletion) => complete(req) as T,
  };
}

describe('LlmTalkComposer', () => {
  it('returns composed prose on success', async () => {
    const composer = new LlmTalkComposer(stubClient(() => ({ body: 'Composed talk prose.' })));
    expect(await composer.composeTalk(plan, opts)).toBe('Composed talk prose.');
  });

  it('falls back to the local scaffold on any error', async () => {
    const composer = new LlmTalkComposer(
      stubClient(() => {
        throw new Error('boom');
      }),
    );
    expect(await composer.composeTalk(plan, opts)).toBe(renderTalk(plan, opts).body);
  });

  it('falls back when the completion is empty', async () => {
    const composer = new LlmTalkComposer(stubClient(() => ({ body: '   ' })));
    const short = await composer.composeShort(plan, plan.points[0], 0, { audience: 'peers' });
    expect(short).toContain('HOOK:'); // the local scaffold
  });
});
