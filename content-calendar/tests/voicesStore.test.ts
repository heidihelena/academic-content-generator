import { beforeEach, describe, expect, it } from 'vitest';
import { seedVoiceProfiles } from '../src/voices/voiceTypes';
import {
  createVoiceProfile,
  deleteVoiceProfile,
  getVoiceProfile,
  listVoiceProfiles,
  resetVoiceProfiles,
  restoreSeedVoiceProfiles,
  updateVoiceProfile,
} from '../src/voices/voicesStore';

describe('voicesStore', () => {
  beforeEach(() => resetVoiceProfiles());

  it('starts with the six seed voices', () => {
    const names = listVoiceProfiles().map((p) => p.name);
    expect(names).toHaveLength(6);
    expect(names).toContain('Patient-safe voice');
    expect(names).toContain('Nordic academic voice');
  });

  it('creates, updates and deletes a profile', () => {
    const created = createVoiceProfile({
      name: 'Test voice',
      tone: 'flat',
      audience: 'testers',
      language: 'en',
      formality: 'balanced',
      preferredLength: 'short',
      wordsToAvoid: ['synergy'],
      styleExamples: [],
    });
    expect(getVoiceProfile(created.id)?.name).toBe('Test voice');

    updateVoiceProfile(created.id, { tone: 'warm' });
    expect(getVoiceProfile(created.id)?.tone).toBe('warm');

    deleteVoiceProfile(created.id);
    expect(getVoiceProfile(created.id)).toBeUndefined();
  });

  it('restores missing seed voices without duplicating or overwriting', () => {
    const seedId = seedVoiceProfiles()[0].id;
    deleteVoiceProfile(seedId);
    updateVoiceProfile(seedVoiceProfiles()[1].id, { tone: 'customised' });

    restoreSeedVoiceProfiles();

    const profiles = listVoiceProfiles();
    expect(profiles.filter((p) => p.id === seedId)).toHaveLength(1);
    expect(getVoiceProfile(seedVoiceProfiles()[1].id)?.tone).toBe('customised');
  });
});
