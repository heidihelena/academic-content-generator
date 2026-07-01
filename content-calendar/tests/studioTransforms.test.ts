import { beforeEach, describe, expect, it } from 'vitest';
import { MEDICAL_DISCLAIMER } from '../src/studio/studioReview';
import { LocalTransformEngine } from '../src/studio/studioTransforms';
import { resetVoiceProfiles } from '../src/voices/voicesStore';

const engine = new LocalTransformEngine();

describe('LocalTransformEngine', () => {
  beforeEach(() => resetVoiceProfiles());

  it('clearer replaces jargon and drops fillers', async () => {
    const out = await engine.transform({
      body: 'We utilize a very robust methodology to demonstrate efficacy.',
      action: 'clearer',
      audience: 'peers',
    });
    expect(out.body).not.toMatch(/utilize|very|demonstrate/i);
    expect(out.body).toContain('use');
  });

  it('shorten trims long paragraphs at sentence boundaries', async () => {
    const body = 'One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten.';
    const out = await engine.transform({ body, action: 'shorten', audience: 'peers' });
    expect(out.body.length).toBeLessThan(body.length);
    expect(out.body.startsWith('One.')).toBe(true);
  });

  it('for-patients adds the medical disclaimer exactly once', async () => {
    const once = await engine.transform({ body: 'A finding.', action: 'for-patients', audience: 'patients' });
    expect(once.body).toContain(MEDICAL_DISCLAIMER);
    const twice = await engine.transform({ body: once.body, action: 'for-patients', audience: 'patients' });
    expect(twice.body.split(MEDICAL_DISCLAIMER)).toHaveLength(2);
  });

  it('more-human adds contractions; more-professional removes them', async () => {
    const human = await engine.transform({ body: 'We are pleased. It is clear. However, more work is needed.', action: 'more-human', audience: 'peers' });
    expect(human.body).toContain("We're");
    expect(human.body.toLowerCase()).toContain('but');

    const formal = await engine.transform({ body: "Don't worry, it's fine.", action: 'more-professional', audience: 'peers' });
    expect(formal.body).toContain('Do not');
    expect(formal.body).toContain('it is');
  });

  it('translate is honest locally: leaves the body unchanged with a note', async () => {
    const out = await engine.transform({ body: 'A finding.', action: 'translate', language: 'fi', audience: 'peers' });
    expect(out.body).toBe('A finding.');
    expect(out.note).toMatch(/language model/i);
  });

  it('apply-voice scrubs the voice profile’s avoided words', async () => {
    const out = await engine.transform({
      body: 'This game-changer result is a breakthrough.',
      action: 'apply-voice',
      voiceProfileId: 'voice_researcher',
      audience: 'peers',
    });
    expect(out.body).not.toMatch(/game-changer|breakthrough/i);
  });
});
