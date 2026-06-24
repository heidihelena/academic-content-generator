import { ComposeRequest } from './composer.types';
import { LocalDraftComposer } from './local.composer';

const req = (over: Partial<ComposeRequest> = {}): ComposeRequest => ({
  title: 'Street trees and heat',
  material: 'Tree cover was associated with cooler streets.',
  channel: 'linkedin',
  audience: 'peers',
  ...over,
});

describe('LocalDraftComposer', () => {
  const composer = new LocalDraftComposer();

  it('composes a default hook from the title', async () => {
    expect(await composer.composeHook(req())).toBe('New from our work: Street trees and heat');
  });

  it('uses a provided hook when present', async () => {
    expect(await composer.composeHook(req({ hook: 'Did you know?' }))).toBe('Did you know?');
  });

  it('composes a draft containing the title, hook, angle and material', async () => {
    const draft = await composer.composeDraft(req({ hook: 'Heatwaves hit unequally', angle: 'equity' }));
    expect(draft).toContain('Heatwaves hit unequally');
    expect(draft).toContain('equity');
    expect(draft).toContain('cooler streets');
    expect(draft).toContain('peers · linkedin');
  });
});
