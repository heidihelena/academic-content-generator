import { ContentPlan } from '../content-plan/content-plan.types';
import { buildTalkUserPrompt } from './talk.prompts';

const plan: ContentPlan = {
  sourceId: 's',
  hook: 'Trees and heat',
  points: [{ claim: 'Canopy cooled streets.' }],
  cta: 'Read it.',
};

describe('buildTalkUserPrompt', () => {
  it('includes the plan and omits the prior-context block when none', () => {
    const prompt = buildTalkUserPrompt(plan, { durationMin: 12, audience: 'peers' });
    expect(prompt).toContain('Canopy cooled streets.');
    expect(prompt).not.toContain('Already published');
  });

  it('adds an "already published — do not repeat" block when prior context is given', () => {
    const prompt = buildTalkUserPrompt(plan, {
      durationMin: 12,
      audience: 'peers',
      priorContext: ['shorts/peers: Canopy cools streets'],
    });
    expect(prompt).toContain('Already published from this source');
    expect(prompt).toContain('- shorts/peers: Canopy cools streets');
  });
});
