import { describe, expect, it } from 'vitest';
import { composeDraft } from '../src/studio/studioDraft';

describe('composeDraft', () => {
  it('writes LinkedIn peer drafts as a natural note, not workflow metadata', () => {
    const body = composeDraft({
      title: 'Street trees and urban heat',
      material: 'Tree cover was associated with cooler streets in the sampled neighbourhoods.',
      channel: 'linkedin',
      audience: 'peers',
      hook: '',
    });

    expect(body).toContain('A few notes for research peers:');
    expect(body).toContain('What I would value from colleagues');
    expect(body.match(/Street trees and urban heat/g)).toHaveLength(1);
    expect(body).not.toContain('for peers');
    expect(body).not.toContain('· linkedin');
  });

  it('keeps the patient-facing disclaimer on LinkedIn patient notes', () => {
    const body = composeDraft({
      title: 'Sleep and recovery',
      material: 'Sleep quality was associated with recovery outcomes.',
      channel: 'linkedin',
      audience: 'patients',
      hook: '',
    });

    expect(body.toLowerCase()).toContain('not medical advice');
  });
});
