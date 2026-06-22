import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DraftsService } from './drafts.service';
import { buildThreadUserPrompt, platformLimit } from './drafts.prompts';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

describe('DraftsService gating', () => {
  it('is disabled when the LLM generator is not selected', () => {
    const svc = new DraftsService(configWith({ 'ai.generator': 'mock' }));
    expect(svc.enabled).toBe(false);
  });

  it('is disabled when the generator is llm but no API key is set', () => {
    const svc = new DraftsService(configWith({ 'ai.generator': 'llm' }));
    expect(svc.enabled).toBe(false);
  });

  it('throws 503 from thread()/shorts() when not configured (frontend falls back)', async () => {
    const svc = new DraftsService(configWith({}));
    await expect(
      svc.thread({ abstract: 'x', audience: 'general public', platform: 'bluesky' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      svc.shorts({ transcript: 'x', audience: 'general public', count: 3 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('enables a client when llm + key are configured', () => {
    const svc = new DraftsService(configWith({ 'ai.generator': 'llm', 'ai.anthropicApiKey': 'sk-test' }));
    expect(svc.enabled).toBe(true);
  });
});

describe('drafts prompts', () => {
  it('maps platforms to their character limits', () => {
    expect(platformLimit('bluesky')).toBe(300);
    expect(platformLimit('linkedin')).toBe(3000);
    expect(platformLimit('youtube')).toBe(5000);
  });

  it('includes the limit, audience and abstract in the thread prompt', () => {
    const p = buildThreadUserPrompt({
      abstract: 'We found a heat-equity gap.',
      audience: 'general public',
      platform: 'bluesky',
      sourceUrl: 'https://doi.org/10.1/x',
    });
    expect(p).toContain('300');
    expect(p).toContain('general public');
    expect(p).toContain('heat-equity gap');
    expect(p).toContain('https://doi.org/10.1/x');
  });
});
