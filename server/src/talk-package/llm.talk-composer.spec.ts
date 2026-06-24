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

/** Replace the private Anthropic client with a stubbed messages.create. */
function stubClient(composer: LlmTalkComposer, create: (...a: unknown[]) => unknown): void {
  (composer as unknown as { client: { messages: { create: unknown } } }).client = {
    messages: { create },
  };
}

function reply(body: string) {
  return async () => ({ content: [{ type: 'text', text: JSON.stringify({ body }) }] });
}

describe('LlmTalkComposer', () => {
  it('returns composed prose on success', async () => {
    const composer = new LlmTalkComposer('key', 'model');
    stubClient(composer, reply('Composed talk prose.'));
    expect(await composer.composeTalk(plan, opts)).toBe('Composed talk prose.');
  });

  it('falls back to the local scaffold on any error', async () => {
    const composer = new LlmTalkComposer('key', 'model');
    stubClient(composer, async () => {
      throw new Error('boom');
    });
    expect(await composer.composeTalk(plan, opts)).toBe(renderTalk(plan, opts).body);
  });

  it('falls back when the completion is empty', async () => {
    const composer = new LlmTalkComposer('key', 'model');
    stubClient(composer, reply('   '));
    const short = await composer.composeShort(plan, plan.points[0], 0, { audience: 'peers' });
    expect(short).toContain('HOOK:'); // the local scaffold
  });
});
