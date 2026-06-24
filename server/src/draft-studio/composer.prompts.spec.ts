import { ComposeRequest } from './composer.types';
import {
  buildDraftUserPrompt,
  buildHookUserPrompt,
  composerSystemPrompt,
} from './composer.prompts';

const req = (over: Partial<ComposeRequest> = {}): ComposeRequest => ({
  title: 'Sleep and memory',
  material: 'Slow-wave sleep supports consolidation.',
  channel: 'linkedin',
  audience: 'peers',
  ...over,
});

describe('composer prompts', () => {
  it('adds plain-language + no-advice guidance for patient-facing audiences', () => {
    expect(composerSystemPrompt('public').toLowerCase()).toContain('not medical advice');
    expect(composerSystemPrompt('peers').toLowerCase()).not.toContain('not medical advice');
    // Safety rules are always present.
    expect(composerSystemPrompt('peers')).toContain('No specific dosages');
  });

  it('asks for a single-sentence hook as JSON', () => {
    const prompt = buildHookUserPrompt(req());
    expect(prompt).toContain('Sleep and memory');
    expect(prompt).toContain('{ "hook": string }');
  });

  it('instructs the patient disclaimer in the draft prompt only for patient-facing audiences', () => {
    expect(buildDraftUserPrompt(req({ audience: 'patients' }))).toContain('not medical advice');
    expect(buildDraftUserPrompt(req({ audience: 'peers' }))).not.toContain('not medical advice');
    expect(buildDraftUserPrompt(req({ hook: 'Big news' }))).toContain('Open with this hook: Big news');
  });
});
