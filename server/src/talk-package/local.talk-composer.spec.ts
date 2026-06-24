import { ContentPlan } from '../content-plan/content-plan.types';
import { LocalTalkComposer } from './local.talk-composer';
import { renderShort, renderTalk } from './talk-render';

const plan: ContentPlan = {
  sourceId: 's',
  hook: 'Trees and heat',
  points: [{ claim: 'Canopy was associated with cooler streets.' }],
  cta: 'Read it.',
};

describe('LocalTalkComposer', () => {
  const composer = new LocalTalkComposer();

  it('composeTalk renders the talk scaffold', async () => {
    expect(await composer.composeTalk(plan, { durationMin: 12, audience: 'peers' })).toBe(
      renderTalk(plan, { durationMin: 12, audience: 'peers' }).body,
    );
  });

  it('composeShort renders the short scaffold', async () => {
    const opts = { audience: 'peers' as const, url: 'u' };
    expect(await composer.composeShort(plan, plan.points[0], 0, opts)).toBe(
      renderShort(plan, plan.points[0], 0, opts),
    );
  });
});
